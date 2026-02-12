import type { Request, Response } from "express"
import { RoomType } from "../models/room.model.js"
import { sendSuccess, sendError } from "../utils/api-response.js"
import { invalidateResourceCache } from "../utils/index.js"

/**
 * @description Creates a new category for rooms (e.g., "Computer Lab").
 */
export const createNewRoomType = async (req: Request, res: Response) => {
  try {
    const newlyCreatedRoomType = await RoomType.create(req.body)
    await invalidateResourceCache("ROOMS")

    return sendSuccess(
      res,
      "Room Type Created",
      "The new room category has been added successfully.",
      newlyCreatedRoomType, // data
      null, // No pagination for single creation
    )
  } catch (error: any) {
    // Map Mongoose errors to your IErrorDetail format
    const errorDetails =
      error.name === "ValidationError"
        ? Object.values(error.errors).map((err: any) => ({
            field: err.path,
            message: err.message,
          }))
        : [{ field: "name", message: error.message }]

    return sendError(
      res,
      "Validation Error",
      "Check if the room type name is unique.",
      errorDetails,
    )
  }
}

/**
 * @description Retrieves all available room types.
 */
export const fetchAllRoomTypes = async (req: Request, res: Response) => {
  try {
    // 1. Get query params and set defaults
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    // 2. Run count and find in parallel
    const [listOfRoomTypes, total] = await Promise.all([
      RoomType.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      RoomType.countDocuments(),
    ])

    const totalPages = Math.ceil(total / limit)

    // 3. Use your utility (Pass the pagination object)
    return sendSuccess(
      res,
      "Room Types Fetched",
      "Successfully loaded the list of room categories.",
      listOfRoomTypes,
      { total, page, limit, totalPages }, // Matches IPagination
    )
  } catch (error: any) {
    return sendError(res, "Server Error", "Unable to load room types.")
  }
}

/**
 * @description Updates a room type name (e.g., renaming "Lab" to "Science Lab").
 */
export const updateRoomTypeDetails = async (req: Request, res: Response) => {
  try {
    const targetRoomTypeId = req.params.id as string
    console.log(
      "Updating Room Type ID:",
      targetRoomTypeId,
      "with data:",
      req.body,
    )

    const updatedRoomTypeRecord = await RoomType.findByIdAndUpdate(
      targetRoomTypeId,
      req.body,
      { new: true, runValidators: true },
    )

    if (!updatedRoomTypeRecord) {
      return sendError(
        res,
        "Not Found",
        "The room type you are trying to update does not exist.",
      )
    }

    // IMPORTANT: Clear/invalidate cache so GET /api/rooms returns the new data
    await invalidateResourceCache("ROOMS")

    return sendSuccess(
      res,
      "Updated",
      "Room type updated successfully.",
      updatedRoomTypeRecord,
    )
  } catch (error: any) {
    console.error("Error updating room type:", error)
    return sendError(res, "Update Error", error.message)
  }
}

/**
 * @description Deletes a room type category.
 */
export const removeRoomTypeFromSystem = async (req: Request, res: Response) => {
  try {
    const targetRoomTypeId = req.params.id as string

    const deletedRecord = await RoomType.findByIdAndDelete(targetRoomTypeId)

    if (!deletedRecord) {
      return sendError(res, "Not Found", "Room type not found.")
    }

    // IMPORTANT: Clear/invalidate cache so GET /api/rooms returns the new data
    await invalidateResourceCache("ROOMS")

    return sendSuccess(res, "Deleted", "The room type has been removed.", {})
  } catch (error: any) {
    return sendError(res, "Delete Error", "Could not remove room type.")
  }
}
