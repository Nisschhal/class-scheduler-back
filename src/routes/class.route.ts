import { Router } from "express"
import {
  createClassSeries,
  getPaginatedClasses,
  updateEntireClassSeries,
  deleteEntireClassSeries,
  cancelSingleInstance,
  updateSingleInstance, // Renamed from modify to update to match the "Upsert" logic
} from "../controllers/class.controller.js"
import { cacheMiddleware } from "../middleware/cache.middleware.js"

const router = Router()

/**
 * 1. FETCH ALL CLASSES
 * Route: GET /api/classes
 * Why: Returns the pre-generated sessions.
 * Middleware: 'cacheMiddleware' handles Redis lookup.
 * If data isn't in Redis, controller runs aggregation and saves it to Redis.
 */
router.get("/", cacheMiddleware, getPaginatedClasses)

/**
 * 2. CREATE NEW SERIES
 * Route: POST /api/classes
 * Why: Generates the initial array of sessions.
 * Invalidation: Clears 'cache:/api/classes*' so the new class shows up immediately.
 */
router.post("/", createClassSeries)

/**
 * 3. UPDATE MASTER RULES (Entire Series)
 * Route: PUT /api/classes/:id
 * Why: Used when changing the Title, Instructor, or Recurrence Pattern for the whole series.
 * Logic: Our controller will "Merge" existing manual edits into the new generated schedule.
 */
router.put("/:id", updateEntireClassSeries)

/**
 * 4. DELETE ENTIRE SERIES
 * Route: DELETE /api/classes/:id
 * Why: Removes the document and all associated sessions.
 */
router.delete("/:id", deleteEntireClassSeries)

/**
 * 5. MODIFY SINGLE SESSION (The "Edit One" Button)
 * Route: PATCH /api/classes/:seriesId/instances/:sessionId
 * Why: Using PATCH is more RESTful for updating a specific item in an array.
 * Params:
 *   - seriesId: The ID of the ClassSchedule document.
 *   - sessionId: The ID of the specific session inside 'preGeneratedClassSessions'.
 * Logic: Performs the "Upsert" on the exceptions array to allow multiple re-edits.
 */
router.patch("/:seriesId/instances/:sessionId", updateSingleInstance)

/**
 * 6. CANCEL SINGLE SESSION (The "Cancel One" Button)
 * Route: DELETE /api/classes/:seriesId/instances/:sessionId
 * Why: Using DELETE on the sub-resource URI is the cleanest way to signify "Removal".
 * Logic: Moves the session to the 'exceptions' array with status 'cancelled'.
 */
router.delete("/:seriesId/instances/:sessionId", cancelSingleInstance)

export default router
