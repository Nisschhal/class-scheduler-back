import { Router } from "express"
import {
  createNewInstructor,
  fetchAllInstructors,
  updateInstructorDetails,
  removeInstructorFromSystem,
} from "../controllers"

import { cacheMiddleware } from "../middleware"

const router = Router()

// Create
router.post("/", createNewInstructor)

// Read (Cached)
router.get("/", cacheMiddleware, fetchAllInstructors) // TODO: Add cacheMiddleware here

// Update
router.put("/:id", updateInstructorDetails)

// Delete
router.delete("/:id", removeInstructorFromSystem)

export default router
