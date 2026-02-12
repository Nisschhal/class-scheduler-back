import { Router } from "express"
import {
  createNewRoomType,
  fetchAllRoomTypes,
  updateRoomTypeDetails,
  removeRoomTypeFromSystem,
  registerNewPhysicalRoom,
  fetchAllPhysicalRooms,
  updatePhysicalRoomDetails,
  removePhysicalRoomFromSystem,
} from "../controllers/index.js"

const router = Router()

// --- ROOM TYPE ROUTES (Categories) ---
router.post("/types", createNewRoomType)
router.get("/types", fetchAllRoomTypes)
router.put("/types/:id", updateRoomTypeDetails)
router.delete("/types/:id", removeRoomTypeFromSystem)

// --- PHYSICAL ROOM ROUTES (Actual Locations) ---
router.post("/physical", registerNewPhysicalRoom)
router.get("/physical", fetchAllPhysicalRooms)
router.put("/physical/:id", updatePhysicalRoomDetails)
router.delete("/physical/:id", removePhysicalRoomFromSystem)

export default router
