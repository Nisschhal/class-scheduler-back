import { z } from "zod"
import { RecurrenceStrategy } from "../../models/class.model"

// Helper for MongoDB ID validation
const objectIdSchema = z.string()

/**
 * INSTRUCTOR VALIDATION
 */
export const instructorSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().email("Invalid email format").lowercase().trim(),
  }),
})

/**
 * ROOM TYPE VALIDATION
 */
export const roomTypeSchema = z.object({
  body: z.object({
    roomTypeName: z.string().min(2, "Room type name is required").trim(),
  }),
})

/**
 * PHYSICAL ROOM VALIDATION
 */
export const physicalRoomSchema = z.object({
  body: z.object({
    roomName: z.string().min(1, "Room name is required").trim(),
    roomTypeReference: objectIdSchema,
    seatingCapacity: z
      .number()
      .int()
      .positive("Capacity must be a positive number"),
  }),
})

/**
 * CLASS SCHEDULE VALIDATION
 */
export const classScheduleSchema = z.object({
  body: z.object({
    classTitle: z.string().min(3, "Class title is required").trim(),
    assignedInstructor: objectIdSchema,
    assignedRoom: objectIdSchema,
    recurrenceType: z.nativeEnum(RecurrenceStrategy),

    // Dates can be strings or Date objects
    seriesStartDate: z.preprocess(
      (arg) => (typeof arg == "string" ? new Date(arg) : arg),
      z.date(),
    ),
    seriesEndDate: z
      .preprocess(
        (arg) => (typeof arg == "string" ? new Date(arg) : arg),
        z.date(),
      )
      .optional(),

    repeatEveryXWeeksOrDays: z.number().int().min(1).default(1),

    // Optional Arrays
    selectedWeekdays: z.array(z.number().min(0).max(6)).optional().default([]),
    selectedMonthDays: z
      .array(z.number().min(1).max(31))
      .optional()
      .default([]),
    manuallyChosenDates: z
      .array(
        z.preprocess(
          (arg) => (typeof arg == "string" ? new Date(arg) : arg),
          z.date(),
        ),
      )
      .optional()
      .default([]),

    // Time slots validation (HH:mm)
    dailyTimeSlots: z
      .array(
        z.object({
          startTime24h: z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be HH:mm format"),
          endTime24h: z
            .string()
            .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be HH:mm format"),
        }),
      )
      .min(1, "At least one time slot is required"),
  }),
})

/**
 * QUERY PARAMS VALIDATION (Common for all FetchAll routes)
 */
export const paginationQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : 10)),
  }),
})

// TYPES (Inferred from Schemas)
export type CreateInstructorInput = z.infer<typeof instructorSchema>["body"]
export type CreatePhysicalRoomInput = z.infer<typeof physicalRoomSchema>["body"]
export type CreateClassScheduleInput = z.infer<
  typeof classScheduleSchema
>["body"]
