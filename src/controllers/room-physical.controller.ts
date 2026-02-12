import type { Request, Response } from "express"
import { PhysicalRoom } from "../models/room.model.js"
import { sendSuccess, sendError } from "../utils/api-response.js"
import { invalidateResourceCache } from "../utils/index.js"
// import { clearCache } from "../middleware/cache.js"

/**
 * @description Registers a specific physical location where classes can be held.
 * @logic       Links the room to a specific RoomType category.
 */
export const registerNewPhysicalRoom = async (req: Request, res: Response) => {
  try {
    const { roomName, roomTypeReference, seatingCapacity } = req.body

    // We create the physical room using the provided data
    const newlyRegisteredRoom = await PhysicalRoom.create({
      roomName,
      roomTypeReference,
      seatingCapacity,
    })

    // IMPORTANT: Clear/invalidate cache so GET /api/rooms returns the new data
    await invalidateResourceCache("ROOMS")

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
 * @description Fetches all physical rooms.
 * @logic       Includes "Population" to show the category name instead of just an ID.
 */
export const fetchAllPhysicalRooms = async (req: Request, res: Response) => {
  try {
    // We use .populate to bring in the name of the RoomType category
    const listOfAllPhysicalRooms =
      await PhysicalRoom.find().populate("roomTypeReference")

    return sendSuccess(
      res,
      "Rooms Fetched",
      "The list of all physical rooms has been retrieved.",
      listOfAllPhysicalRooms,
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
 * @description Updates the details of a physical room (e.g., increasing capacity).
 */
export const updatePhysicalRoomDetails = async (
  req: Request,
  res: Response,
) => {
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

    // IMPORTANT: Clear/invalidate cache so GET /api/rooms returns the new data
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

    // IMPORTANT: Clear/invalidate cache so GET /api/rooms returns the new data
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
