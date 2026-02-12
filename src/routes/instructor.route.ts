import { Router } from "express"
import {
  createNewInstructor,
  fetchAllInstructors,
  updateInstructorDetails,
  removeInstructorFromSystem,
} from "../controllers/index.js"
import { cacheMiddleware, validate } from "../middleware/index.js"
import { instructorSchema, paginationQuerySchema } from "../utils/index.js"

const router = Router()

router.post("/", validate(instructorSchema), createNewInstructor)

router.get(
  "/",
  validate(paginationQuerySchema),
  cacheMiddleware,
  fetchAllInstructors,
)

router.put("/:id", validate(instructorSchema), updateInstructorDetails)

router.delete("/:id", removeInstructorFromSystem)

export default router
