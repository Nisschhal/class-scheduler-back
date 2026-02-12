import type { Request, Response } from "express"
import { PhysicalRoom } from "../models/room.model.js"
import { sendSuccess, sendError } from "../utils/api-response.js"
import { invalidateResourceCache } from "../utils/index.js"

/**
 * @description Registers a specific physical location where classes can be held.
 */
export const registerNewPhysicalRoom = async (req: Request, res: Response) => {
  try {
    const { roomName, roomTypeReference, seatingCapacity } = req.body

    const newlyRegisteredRoom = await PhysicalRoom.create({
      roomName,
      roomTypeReference,
      seatingCapacity,
    })

    await invalidateResourceCache("ROOMS")

    // Returns "Success Response Without Pagination"
    return sendSuccess(
      res,
      "Physical Room Created",
      `Room "${roomName}" has been successfully added to the inventory.`,
      newlyRegisteredRoom,
    )
  } catch (error: any) {
    return sendError(
      res,
      "Validation Error",
      "Could not register the room. Ensure the name is unique.",
      [{ field: "roomName", message: error.message }],
    )
  }
}

/**
 * @description Fetches all physical rooms with pagination.
 * @url_example /api/rooms/physical?page=1&limit=10
 */
export const fetchAllPhysicalRooms = async (req: Request, res: Response) => {
  try {
    // 1. Setup pagination variables
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    // 2. Fetch data and total count in parallel
    const [listOfAllPhysicalRooms, total] = await Promise.all([
      PhysicalRoom.find()
        .populate("roomTypeReference")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PhysicalRoom.countDocuments(),
    ])

    // 3. Calculate total pages
    const totalPages = Math.ceil(total / limit)

    // 4. Returns "Success Response With Pagination"
    return sendSuccess(
      res,
      "Rooms Fetched",
      "The list of all physical rooms has been retrieved.",
      listOfAllPhysicalRooms,
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
      "An error occurred while loading the physical rooms.",
    )
  }
}

/**
 * @description Updates the details of a physical room.
 */
export const updatePhysicalRoomDetails = async (
  req: Request,
  res: Response,
) => {
  console.log("Update Physical Room Details Called with body:", req.body)
  try {
    const targetRoomId = req.params.id as string

    const updatedRoomRecord = await PhysicalRoom.findByIdAndUpdate(
      targetRoomId,
      req.body,
      { new: true, runValidators: true },
    ).populate("roomTypeReference")

    if (!updatedRoomRecord) {
      return sendError(
        res,
        "Not Found",
        "The physical room requested was not found.",
      )
    }

    await invalidateResourceCache("ROOMS")

    return sendSuccess(
      res,
      "Room Updated",
      "Physical room details saved.",
      updatedRoomRecord,
    )
  } catch (error: any) {
    return sendError(res, "Update Failed", error.message)
  }
}

/**
 * @description Deletes a physical room.
 */
export const removePhysicalRoomFromSystem = async (
  req: Request,
  res: Response,
) => {
  try {
    const targetRoomId = req.params.id as string

    const deletedRoom = await PhysicalRoom.findByIdAndDelete(targetRoomId)

    if (!deletedRoom) {
      return sendError(res, "Not Found", "Could not find the room to delete.")
    }

    await invalidateResourceCache("ROOMS")

    return sendSuccess(
      res,
      "Deleted",
      "The physical room has been removed.",
      {},
    )
  } catch (error: any) {
    return sendError(res, "Delete Error", "An error occurred during deletion.")
  }
}
