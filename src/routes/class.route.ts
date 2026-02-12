import { Router } from "express"
import {
  createClassSeries,
  getPaginatedClasses,
  updateClassSeries,
} from "../controllers/class.controller"
// import  } from "../middleware/cache.js"

const router = Router()

/**
 * @route   GET /api/classes
 * @desc    Fetch classes (Aggregation + Pagination + Redis)
 */
router.get("/", getPaginatedClasses)

/**
 * @route   POST /api/classes
 * @desc    Create Single/Recurring class
 */
router.post("/", createClassSeries)

/**
 * @route   PUT /api/classes/:id
 * @desc    Update a class series
 */
router.put("/:id", updateClassSeries)

/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete a class series
 */
// router.delete("/:id", deleteClassSeries)

export default router
