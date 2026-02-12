import { Schema, model, Document, Types } from "mongoose"

/**
 * RECURRENCE PATTERN ENUM
 * Explains how a class repeats over time.
 */
export enum RecurrenceStrategy {
  SINGLE_INSTANCE = "none", // A one-time event
  EVERY_DAY = "daily", // Repeats daily based on interval
  SPECIFIC_WEEKDAYS = "weekly", // Repeats on selected days (Mon, Wed, etc.)
  SPECIFIC_MONTH_DAYS = "monthly", // Repeats on specific dates (1st, 15th, etc.)
  CUSTOM_LOGIC = "custom", // Advanced looping or manual date selection
}

/**
 * PRE-GENERATED SESSION INTERFACE
 * This is the "Result" of our generator logic.
 * These are the actual items that show up on the Calendar UI.
 */
interface IIndividualClassSession {
  sessionStartDateTime: Date // Full ISO Date and Time
  sessionEndDateTime: Date // Full ISO Date and Time
}

/**
 * TIME WINDOW INTERFACE
 * Defines the clock-time of the class (24h format).
 */
interface ITimeWindow {
  startTime24h: string // e.g., "09:30"
  endTime24h: string // e.g., "11:00"
}

export interface IClassSchedule extends Document {
  classTitle: string
  assignedInstructor: Types.ObjectId
  assignedRoom: Types.ObjectId

  recurrenceType: RecurrenceStrategy

  // BOUNDARIES: These define the start and end of the repeating series
  seriesStartDate: Date
  seriesEndDate?: Date // Mandatory for repeating classes to prevent infinite loops

  // RULES: These define the "Logic" of the repetition
  repeatEveryXWeeksOrDays: number // The interval (e.g., 2 = every 2nd week)
  selectedWeekdays: number[] // 0 (Sun) to 6 (Sat)
  selectedMonthDays: number[] // 1 to 31
  manuallyChosenDates: Date[] // For random-pick mode in Custom

  dailyTimeSlots: ITimeWindow[] // Multiple slots allowed per day (9AM, 2PM)

  // THE GENERATED OUTPUT
  preGeneratedClassSessions: IIndividualClassSession[]
}

const ClassScheduleSchema = new Schema<IClassSchedule>(
  {
    classTitle: { type: String, required: true, trim: true, index: true },
    assignedInstructor: {
      type: Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
      index: true,
    },
    assignedRoom: {
      type: Schema.Types.ObjectId,
      ref: "PhysicalRoom",
      required: true,
      index: true,
    },

    recurrenceType: {
      type: String,
      enum: Object.values(RecurrenceStrategy),
      default: RecurrenceStrategy.SINGLE_INSTANCE,
    },

    seriesStartDate: { type: Date, required: true },
    seriesEndDate: { type: Date }, // Boundary for the loops

    repeatEveryXWeeksOrDays: { type: Number, default: 1 }, // Used for Intervals
    selectedWeekdays: [{ type: Number, min: 0, max: 6 }],
    selectedMonthDays: [{ type: Number, min: 1, max: 31 }],
    manuallyChosenDates: [{ type: Date }],

    dailyTimeSlots: [
      {
        startTime24h: { type: String, required: true },
        endTime24h: { type: String, required: true },
      },
    ],

    // This array is used by the Aggregation Pipeline for fast Calendar Rendering
    preGeneratedClassSessions: [
      {
        sessionStartDateTime: { type: Date, required: true },
        sessionEndDateTime: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true },
)

/**
 * COMPOUND INDEXES for Conflict Prevention
 * Why: Allows MongoDB to instantly check if a room or instructor is busy
 * at a specific date/time without reading every document in the database.
 */
ClassScheduleSchema.index({
  assignedRoom: 1,
  "preGeneratedClassSessions.sessionStartDateTime": 1,
})
ClassScheduleSchema.index({
  assignedInstructor: 1,
  "preGeneratedClassSessions.sessionStartDateTime": 1,
})

export const ClassSchedule = model<IClassSchedule>(
  "ClassSchedule",
  ClassScheduleSchema,
)
