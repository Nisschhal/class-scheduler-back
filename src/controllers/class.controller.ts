import { Request, Response } from "express"
import { ClassSchedule } from "../models/class.model.js"
import { sendSuccess, sendError } from "../utils/api-response.js"
import { format } from "date-fns"
import { invalidateResourceCache } from "../utils/cache-helper.js"
import { generateAllClassSessions } from "../utils/schedule-generator.util.js"

/**
 * HELPER: DETAILED CONFLICT CHECKER
 * Why: Checks both Room and Instructor against ALL other pre-generated sessions.
 */
const findDetailedSchedulingConflict = async (
  requestedSessions: { sessionStartDateTime: Date; sessionEndDateTime: Date }[],
  targetRoomId: string,
  targetInstructorId: string,
  ignoreSeriesId?: string,
) => {
  const conflictQuery: any = {
    $or: [
      { assignedRoom: targetRoomId },
      { assignedInstructor: targetInstructorId },
    ],
    preGeneratedClassSessions: {
      $elemMatch: {
        $or: requestedSessions.map((newSess) => ({
          sessionStartDateTime: { $lt: newSess.sessionEndDateTime },
          sessionEndDateTime: { $gt: newSess.sessionStartDateTime },
        })),
      },
    },
  }

  if (ignoreSeriesId) conflictQuery._id = { $ne: ignoreSeriesId }

  const conflictingSeries = await ClassSchedule.findOne(conflictQuery).populate(
    "assignedRoom assignedInstructor",
  )
  if (!conflictingSeries) return null

  const exactSession = conflictingSeries.preGeneratedClassSessions.find(
    (existing) =>
      requestedSessions.some(
        (proposed) =>
          proposed.sessionStartDateTime < existing.sessionEndDateTime &&
          proposed.sessionEndDateTime > existing.sessionStartDateTime,
      ),
  )

  const isInstructor =
    conflictingSeries.assignedInstructor._id.toString() === targetInstructorId
  return {
    field: isInstructor ? "assignedInstructor" : "assignedRoom",
    message: `${isInstructor ? "Instructor" : "Room"} is busy on ${format(exactSession!.sessionStartDateTime, "PPpp")}`,
  }
}

/**
 * CREATE CLASS SERIES
 */
export const createClassSeries = async (req: Request, res: Response) => {
  try {
    const generatedSessions = generateAllClassSessions(req.body)
    const conflict = await findDetailedSchedulingConflict(
      generatedSessions,
      req.body.assignedRoom,
      req.body.assignedInstructor,
    )

    if (conflict)
      return sendError(res, "Conflict", conflict.message, [conflict])

    const newClass = await ClassSchedule.create({
      ...req.body,
      preGeneratedClassSessions: generatedSessions,
    })
    await invalidateResourceCache("CLASSES")
    return sendSuccess(res, "Success", "Series created", newClass)
  } catch (error: any) {
    return sendError(res, "Error", error.message)
  }
}

/**
 * GET PAGINATED CLASSES
 * Why: Uses aggregation $facet to return total count and joined data in one request.
 */
export const getPaginatedClasses = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10

    const results = await ClassSchedule.aggregate([
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: "instructors",
                localField: "assignedInstructor",
                foreignField: "_id",
                as: "instructor",
              },
            },
            {
              $lookup: {
                from: "physicalrooms",
                localField: "assignedRoom",
                foreignField: "_id",
                as: "room",
              },
            },
            { $unwind: "$instructor" },
            { $unwind: "$room" },
          ],
        },
      },
    ])

    const total = results[0].metadata[0]?.total || 0
    return sendSuccess(res, "Fetched", "Success", results[0].data, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    return sendError(res, "Error", error.message)
  }
}

/**
 * UPDATE ENTIRE SERIES (Bulk Update)
 * Why: Merges existing exceptions into new rules to protect manual changes.
 */
export const updateEntireClassSeries = async (req: Request, res: Response) => {
  try {
    let { id } = req.params
    if (Array.isArray(id)) id = id[0]
    const series = await ClassSchedule.findById(id)
    if (!series) return sendError(res, "Not Found", "Series not found")

    // 1. Generate "Fresh" sessions from new rules
    let newSessions = generateAllClassSessions(req.body)

    // 2. THE PROTECTION LOGIC: Apply old exceptions to new sessions
    newSessions = newSessions
      .map((sess) => {
        const manualEdit = series.exceptions.find(
          (ex) =>
            ex.originalStart.getTime() ===
              sess.sessionStartDateTime.getTime() && ex.status === "modified",
        )
        if (manualEdit) {
          return {
            ...sess,
            sessionStartDateTime: manualEdit.newStart!,
            sessionEndDateTime: manualEdit.newEnd!,
          }
        }
        return sess
      })
      .filter((sess) => {
        // Remove sessions that were previously cancelled
        return !series.exceptions.some(
          (ex) =>
            ex.originalStart.getTime() ===
              sess.sessionStartDateTime.getTime() && ex.status === "cancelled",
        )
      })

    // 3. Conflict check the merged schedule
    const conflict = await findDetailedSchedulingConflict(
      newSessions,
      req.body.assignedRoom,
      req.body.assignedInstructor,
      id,
    )
    if (conflict) return sendError(res, "Conflict", conflict.message)

    const updated = await ClassSchedule.findByIdAndUpdate(
      id,
      { ...req.body, preGeneratedClassSessions: newSessions },
      { new: true },
    )
    await invalidateResourceCache("CLASSES")
    return sendSuccess(res, "Success", "Entire series updated", updated)
  } catch (error: any) {
    return sendError(res, "Error", error.message)
  }
}

/**
 * UPDATE SINGLE INSTANCE (Re-editable Upsert Logic)
 * Why: Allows moving one session. If moved again, it updates the same exception.
 */
export const updateSingleInstance = async (req: Request, res: Response) => {
  try {
    const { seriesId, sessionId } = req.params
    const { newStart, newEnd, reason } = req.body

    const series = await ClassSchedule.findById(seriesId)
    if (!series) return sendError(res, "Not Found", "Series not found")

    const sessionIdStr = Array.isArray(sessionId) ? sessionId[0] : sessionId
    const session = series.preGeneratedClassSessions.id(sessionIdStr)
    if (!session)
      return sendError(res, "Not Found", "Session instance not found")

    // Conflict Check
    const seriesIdStr = Array.isArray(seriesId) ? seriesId[0] : seriesId
    const conflict = await findDetailedSchedulingConflict(
      [
        {
          sessionStartDateTime: new Date(newStart),
          sessionEndDateTime: new Date(newEnd),
        },
      ],
      series.assignedRoom.toString(),
      series.assignedInstructor.toString(),
      seriesIdStr,
    )
    if (conflict) return sendError(res, "Conflict", conflict.message)

    // UPSERT EXCEPTION: Find if this session was already modified before
    const exIdx = series.exceptions.findIndex(
      (ex) =>
        ex.originalStart.getTime() === session.sessionStartDateTime.getTime(),
    )

    if (exIdx !== -1) {
      // Update existing exception
      series.exceptions[exIdx].newStart = new Date(newStart)
      series.exceptions[exIdx].newEnd = new Date(newEnd)
      series.exceptions[exIdx].reason = reason || "Updated again"
    } else {
      // Create new exception record
      series.exceptions.push({
        originalStart: session.sessionStartDateTime,
        status: "modified",
        newStart: new Date(newStart),
        newEnd: new Date(newEnd),
        reason: reason || "Manual override",
      })
    }

    // Apply to Source of Truth
    session.sessionStartDateTime = new Date(newStart)
    session.sessionEndDateTime = new Date(newEnd)

    await series.save()
    await invalidateResourceCache("CLASSES")
    return sendSuccess(res, "Success", "Instance updated", series)
  } catch (error: any) {
    return sendError(res, "Error", error.message)
  }
}

/**
 * CANCEL SINGLE INSTANCE
 */
export const cancelSingleInstance = async (req: Request, res: Response) => {
  try {
    const { seriesId, sessionId } = req.params
    const series = await ClassSchedule.findById(seriesId)
    if (!series) return sendError(res, "Not Found", "Series not found")

    const sessionIdStr = Array.isArray(sessionId) ? sessionId[0] : sessionId
    const session = series.preGeneratedClassSessions.id(sessionIdStr)
    if (!session) return sendError(res, "Not Found", "Session not found")

    // Add to exceptions so we don't regenerate it later
    series.exceptions.push({
      originalStart: session.sessionStartDateTime,
      status: "cancelled",
      reason: req.body?.reason ?? "Cancelled by user",
    })

    // Remove from the pre-generated array (Source of Truth)
    series.preGeneratedClassSessions.pull(sessionId)

    await series.save()
    await invalidateResourceCache("CLASSES")
    return sendSuccess(res, "Success", "Instance cancelled", { sessionId })
  } catch (error: any) {
    return sendError(res, "Error", error.message)
  }
}

/**
 * DELETE ENTIRE SERIES
 */
export const deleteEntireClassSeries = async (req: Request, res: Response) => {
  try {
    await ClassSchedule.findByIdAndDelete(req.params.id)
    await invalidateResourceCache("CLASSES")
    return sendSuccess(res, "Success", "Series deleted completely")
  } catch (error: any) {
    return sendError(res, "Error", error.message)
  }
}
