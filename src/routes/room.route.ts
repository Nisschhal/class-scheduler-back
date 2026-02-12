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
import { cacheMiddleware, validate } from "../middleware/index.js"
import {
  paginationQuerySchema,
  physicalRoomSchema,
  roomTypeSchema,
} from "../utils/index.js"

const router = Router()

/* ── Room Types ────────────────────────────────────────────────────────────── */
router.post("/types", validate(roomTypeSchema), createNewRoomType)
router.get(
  "/types",
  validate(paginationQuerySchema),
  cacheMiddleware,
  fetchAllRoomTypes,
)
router.put("/types/:id", validate(roomTypeSchema), updateRoomTypeDetails)
router.delete("/types/:id", removeRoomTypeFromSystem)

/* ── Physical Rooms ────────────────────────────────────────────────────────── */
router.post("/physical", validate(physicalRoomSchema), registerNewPhysicalRoom)
router.get(
  "/physical",
  validate(paginationQuerySchema),
  cacheMiddleware,
  fetchAllPhysicalRooms,
)
router.put(
  "/physical/:id",
  validate(physicalRoomSchema),
  updatePhysicalRoomDetails,
)
router.delete("/physical/:id", removePhysicalRoomFromSystem)

export default router
