import { Request, Response } from "express"
import { ClassSchedule } from "../models/class.model.js"
import { Instructor } from "../models/instructor.model.js"
import { PhysicalRoom } from "../models/room.model.js"
import { sendSuccess, sendError } from "../utils/api-response.js"
import { format } from "date-fns"
import { invalidateResourceCache } from "../utils/cache-helper.js"
import { generateAllClassSessions } from "../utils/schedule-generator.util.js"

/**
 * HELPER: EXPLICIT CONFLICT DETECTOR
 * @description Checks if an Instructor or Room is already booked for the proposed times.
 * @returns An explicit error message detailing WHO, WHERE, and WHEN the conflict is.
 */
const findDetailedSchedulingConflict = async (
  requestedSessions: { sessionStartDateTime: Date; sessionEndDateTime: Date }[],
  targetRoomId: string,
  targetInstructorId: string,
  ignoreSeriesId?: string,
) => {
  // 1. Prepare query logic: Check if any existing session overlaps with our proposed time slots
  const baseQuery = (field: string, id: string) => ({
    [field]: id,
    ...(ignoreSeriesId && { _id: { $ne: ignoreSeriesId } }), // Don't conflict with itself during updates
    preGeneratedClassSessions: {
      $elemMatch: {
        $or: requestedSessions.map((newSess) => ({
          sessionStartDateTime: { $lt: newSess.sessionEndDateTime },
          sessionEndDateTime: { $gt: newSess.sessionStartDateTime },
        })),
      },
    },
  })

  // 2. Run Instructor and Room checks simultaneously
  const [instructorConflict, roomConflict] = await Promise.all([
    ClassSchedule.findOne(
      baseQuery("assignedInstructor", targetInstructorId),
    ).populate("assignedInstructor"),
    ClassSchedule.findOne(baseQuery("assignedRoom", targetRoomId)).populate(
      "assignedRoom",
    ),
  ])

  if (!instructorConflict && !roomConflict) return null

  // 3. Identify the exact session that caused the overlap for the error message
  const conflictSource = instructorConflict || roomConflict
  const overlappingSession = conflictSource!.preGeneratedClassSessions.find(
    (existing) =>
      requestedSessions.some(
        (proposed) =>
          proposed.sessionStartDateTime < existing.sessionEndDateTime &&
          proposed.sessionEndDateTime > existing.sessionStartDateTime,
      ),
  )

  // 4. Format human-readable date and time
  const dateStr = format(
    overlappingSession!.sessionStartDateTime,
    "EEEE, MMM do, yyyy",
  )
  const timeStart = format(overlappingSession!.sessionStartDateTime, "hh:mm a")
  const timeEnd = format(overlappingSession!.sessionEndDateTime, "hh:mm a")

  // 5. Build the Explicit Message
  let entityName = ""
  let field = ""

  if (instructorConflict && roomConflict) {
    const teacher = (instructorConflict.assignedInstructor as any).name
    const room = (roomConflict.assignedRoom as any).roomName
    entityName = `Instructor "${teacher}" AND Room "${room}" are both`
    field = "assignedInstructor"
  } else if (instructorConflict) {
    const teacher = (instructorConflict.assignedInstructor as any).name
    entityName = `Instructor "${teacher}" is`
    field = "assignedInstructor"
  } else {
    const room = (roomConflict!.assignedRoom as any).roomName
    entityName = `Room "${room}" is`
    field = "assignedRoom"
  }

  return {
    field,
    message: `Conflict Detected: ${entityName} occupied on ${dateStr} from ${timeStart} to ${timeEnd}.`,
  }
}

/**
 * CREATE CLASS SERIES
 * @logic Generates all session dates based on rules and checks for overlaps before saving.
 */
export const createClassSeries = async (req: Request, res: Response) => {
  try {
    // Generate the array of sessions (Source of Truth)
    const generatedSessions = generateAllClassSessions(req.body)

    // Explicit overlap check
    const conflict = await findDetailedSchedulingConflict(
      generatedSessions,
      req.body.assignedRoom,
      req.body.assignedInstructor,
    )

    if (conflict)
      return sendError(res, "Scheduling Conflict", conflict.message, [conflict])

    const newClass = await ClassSchedule.create({
      ...req.body,
      preGeneratedClassSessions: generatedSessions,
    })

    await invalidateResourceCache("CLASSES")

    return sendSuccess(
      res,
      "Series Created",
      "The new class schedule and sessions have been generated.",
      newClass,
    )
  } catch (error: any) {
    return sendError(res, "Validation Error", error.message)
  }
}

/**
 * GET PAGINATED CLASSES
 * @logic Uses aggregation $facet to return data and total record count in a single request.
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

    return sendSuccess(
      res,
      "Classes Fetched",
      "Class list loaded successfully",
      results[0].data,
      {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    )
  } catch (error: any) {
    return sendError(res, "Server Error", "Unable to load class schedules.")
  }
}

/**
 * UPDATE ENTIRE SERIES (Bulk Edit)
 * @logic Re-generates sessions but protects manual overrides stored in 'exceptions'.
 */
export const updateEntireClassSeries = async (req: Request, res: Response) => {
  try {
    let id = req.params.id
    if (Array.isArray(id)) id = id[0]
    const series = await ClassSchedule.findById(id)
    if (!series) return sendError(res, "Not Found", "Series not found")

    // 1. Generate new sessions from the updated rules
    let newSessions = generateAllClassSessions(req.body)

    // 2. PROTECTION: Apply existing manual edits/cancellations to the new set
    newSessions = newSessions
      .map((sess) => {
        const manualEdit = series.exceptions.find(
          (ex) =>
            ex.originalStart.getTime() ===
              sess.sessionStartDateTime.getTime() && ex.status === "modified",
        )
        return manualEdit
          ? {
              ...sess,
              sessionStartDateTime: manualEdit.newStart!,
              sessionEndDateTime: manualEdit.newEnd!,
            }
          : sess
      })
      .filter(
        (sess) =>
          !series.exceptions.some(
            (ex) =>
              ex.originalStart.getTime() ===
                sess.sessionStartDateTime.getTime() &&
              ex.status === "cancelled",
          ),
      )

    // 3. Conflict Check the merged schedule
    const conflict = await findDetailedSchedulingConflict(
      newSessions,
      req.body.assignedRoom,
      req.body.assignedInstructor,
      id,
    )
    if (conflict)
      return sendError(res, "Conflict", conflict.message, [conflict])

    const updated = await ClassSchedule.findByIdAndUpdate(
      id,
      { ...req.body, preGeneratedClassSessions: newSessions },
      { new: true },
    )

    await invalidateResourceCache("CLASSES")
    return sendSuccess(
      res,
      "Series Updated",
      "The entire series and its sessions have been updated.",
      updated,
    )
  } catch (error: any) {
    return sendError(res, "Update Error", error.message)
  }
}

/**
 * UPDATE SINGLE INSTANCE
 * @logic Reschedules one specific session and records it as an 'exception' to prevent bulk-update overwrites.
 */
export const updateSingleInstance = async (req: Request, res: Response) => {
  try {
    const { seriesId, sessionId } = req.params
    const { newStart, newEnd, reason } = req.body

    const series = await ClassSchedule.findById(seriesId)
    if (!series) return sendError(res, "Not Found", "Series not found")

    const normalizedSessionId = Array.isArray(sessionId)
      ? sessionId[0]
      : sessionId
    const session = series.preGeneratedClassSessions.id(normalizedSessionId)
    if (!session)
      return sendError(res, "Not Found", "Session instance not found")

    // Explicit conflict check for this specific slot
    const conflict = await findDetailedSchedulingConflict(
      [
        {
          sessionStartDateTime: new Date(newStart),
          sessionEndDateTime: new Date(newEnd),
        },
      ],
      series.assignedRoom.toString(),
      series.assignedInstructor.toString(),
      Array.isArray(seriesId) ? seriesId[0] : seriesId,
    )
    if (conflict)
      return sendError(res, "Conflict", conflict.message, [conflict])

    // Upsert logic: Track this change in the exceptions array
    const exIdx = series.exceptions.findIndex(
      (ex) =>
        ex.originalStart.getTime() === session.sessionStartDateTime.getTime(),
    )
    if (exIdx !== -1) {
      series.exceptions[exIdx].newStart = new Date(newStart)
      series.exceptions[exIdx].newEnd = new Date(newEnd)
    } else {
      series.exceptions.push({
        originalStart: session.sessionStartDateTime,
        status: "modified",
        newStart: new Date(newStart),
        newEnd: new Date(newEnd),
        reason: reason || "Manual override",
      })
    }

    // Apply change to the pre-generated session
    session.sessionStartDateTime = new Date(newStart)
    session.sessionEndDateTime = new Date(newEnd)

    await series.save()
    await invalidateResourceCache("CLASSES")
    return sendSuccess(
      res,
      "Instance Updated",
      "Single session moved successfully.",
      series,
    )
  } catch (error: any) {
    return sendError(res, "Update Error", error.message)
  }
}

/**
 * CANCEL SINGLE INSTANCE
 * @logic Removes a session from the active list and marks it as cancelled in exceptions.
 */
export const cancelSingleInstance = async (req: Request, res: Response) => {
  try {
    const { seriesId, sessionId } = req.params
    const series = await ClassSchedule.findById(seriesId)
    if (!series) return sendError(res, "Not Found", "Series not found")

    const normalizedSessionId = Array.isArray(sessionId)
      ? sessionId[0]
      : sessionId
    const session = series.preGeneratedClassSessions.id(normalizedSessionId)
    if (!session) return sendError(res, "Not Found", "Session not found")

    series.exceptions.push({
      originalStart: session.sessionStartDateTime,
      status: "cancelled",
      reason: req.body?.reason ?? "Cancelled by user",
    })

    series.preGeneratedClassSessions.pull(sessionId)

    await series.save()
    await invalidateResourceCache("CLASSES")
    return sendSuccess(
      res,
      "Session Cancelled",
      "The session has been removed from the schedule.",
      { sessionId },
    )
  } catch (error: any) {
    return sendError(res, "Cancellation Error", error.message)
  }
}

/**
 * DELETE ENTIRE SERIES
 */
export const deleteEntireClassSeries = async (req: Request, res: Response) => {
  try {
    await ClassSchedule.findByIdAndDelete(req.params.id)
    await invalidateResourceCache("CLASSES")
    return sendSuccess(
      res,
      "Series Deleted",
      "The entire class series has been removed.",
      {},
    )
  } catch (error: any) {
    return sendError(
      res,
      "Delete Error",
      "An error occurred while deleting the series.",
    )
  }
}
