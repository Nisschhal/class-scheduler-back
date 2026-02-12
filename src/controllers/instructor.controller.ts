import type { Request, Response } from "express"
import { Instructor } from "../models/instructor.model.js"
import { sendSuccess, sendError } from "../utils/api-response.js"
import { invalidateResourceCache } from "../utils/index.js"

/**
 * @description Creates a new instructor record in the database.
 */
export const createNewInstructor = async (req: Request, res: Response) => {
  try {
    const newlyCreatedInstructor = await Instructor.create(req.body)

    // Invalidate cache so GET /api/instructors reflects changes
    await invalidateResourceCache("INSTRUCTORS")

    return sendSuccess(
      res,
      "Instructor Created",
      "The new instructor has been successfully added to the system.",
      newlyCreatedInstructor,
    )
  } catch (error: any) {
    return sendError(
      res,
      "Validation Error",
      "The instructor details provided are invalid.",
      [{ field: "email", message: error.message }],
    )
  }
}

/**
 * @description Retrieves all instructors with pagination.
 * @url_example /api/instructors?page=1&limit=10
 */
export const fetchAllInstructors = async (req: Request, res: Response) => {
  try {
    // 1. Setup pagination variables
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    // 2. Fetch data and total count in parallel
    const [listOfAllInstructors, total] = await Promise.all([
      Instructor.find()
        .sort({ name: 1 }) // Sorting by name alphabetically is usually helpful for instructors
        .skip(skip)
        .limit(limit),
      Instructor.countDocuments(),
    ])

    // 3. Calculate total pages
    const totalPages = Math.ceil(total / limit)

    // 4. Returns "Success Response With Pagination"
    return sendSuccess(
      res,
      "Instructors Fetched",
      "The complete list of instructors has been loaded.",
      listOfAllInstructors,
      {
        total,
        page,
        limit,
        totalPages,
      },
    )
  } catch (error: any) {
    return sendError(
      res,
      "Server Error",
      "An internal error occurred while fetching the instructor list.",
    )
  }
}

/**
 * @description Updates an existing instructor's profile.
 */
export const updateInstructorDetails = async (req: Request, res: Response) => {
  try {
    const targetInstructorId = req.params.id as string

    const successfullyUpdatedInstructor = await Instructor.findByIdAndUpdate(
      targetInstructorId,
      req.body,
      { new: true, runValidators: true },
    )

    if (!successfullyUpdatedInstructor) {
      return sendError(
        res,
        "Not Found",
        "We could not find an instructor with the provided ID.",
      )
    }

    await invalidateResourceCache("INSTRUCTORS")

    return sendSuccess(
      res,
      "Instructor Updated",
      "The instructor's information has been successfully updated.",
      successfullyUpdatedInstructor,
    )
  } catch (error: any) {
    return sendError(
      res,
      "Update Failed",
      "We were unable to save the changes to the instructor profile.",
    )
  }
}

/**
 * @description Removes an instructor from the system.
 */
export const removeInstructorFromSystem = async (
  req: Request,
  res: Response,
) => {
  try {
    const targetInstructorId = req.params.id as string

    const deletedInstructorRecord =
      await Instructor.findByIdAndDelete(targetInstructorId)

    if (!deletedInstructorRecord) {
      return sendError(
        res,
        "Not Found",
        "The instructor you are trying to delete does not exist.",
      )
    }

    await invalidateResourceCache("INSTRUCTORS")

    return sendSuccess(
      res,
      "Instructor Deleted",
      "The instructor has been removed from the database.",
      {}, // Empty data as requested for deleted records
    )
  } catch (error: any) {
    return sendError(
      res,
      "Delete Error",
      "An error occurred while trying to remove the instructor.",
    )
  }
}
