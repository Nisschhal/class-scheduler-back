import { addMinutes, differenceInDays, differenceInWeeks } from "date-fns"

/**
 * INTERFACE: RequiredSessionStructure
 * Why: This ensures the generator and the database model speak the same language.
 */
interface RequiredSessionStructure {
  sessionStartDateTime: Date
  sessionEndDateTime: Date
}

/**
 * FUNCTION: calculateAllClassSessions
 * Purpose: This is the "Engine" that loops through time to find every day a class should occur.
 */
export const calculateAllClassSessions = (
  userRequestPayload: any,
): RequiredSessionStructure[] => {
  const finalGeneratedSessions: RequiredSessionStructure[] = []

  const {
    seriesStartDate,
    seriesEndDate,
    recurrenceType,
    dailyTimeSlots,
    selectedWeekdays,
    selectedMonthDays,
    repeatEveryXWeeksOrDays = 1,
    manuallyChosenDates = [],
  } = userRequestPayload

  /**
   * SCENARIO 1: MANUAL DATE SELECTION (Custom Mode)
   * Why: Handle users who picked random, non-pattern dates on a calendar.
   */
  if (recurrenceType === "custom" && manuallyChosenDates.length > 0) {
    manuallyChosenDates.forEach((manuallyPickedDateString: string) => {
      const baseDateObject = new Date(manuallyPickedDateString)
      dailyTimeSlots.forEach((timeSlotObject: any) => {
        // We push the result of our helper directly into the array
        finalGeneratedSessions.push(
          combineDateWithTime(
            baseDateObject,
            timeSlotObject.startTime24h,
            timeSlotObject.endTime24h,
          ),
        )
      })
    })
    return finalGeneratedSessions
  }

  /**
   * SCENARIO 2: PATTERN-BASED GENERATION (Daily, Weekly, Monthly)
   * Why: We use a 'Cursor' to walk from the start date to the end date.
   */
  let currentIterationDateCursor = new Date(seriesStartDate)
  const scheduleStopBoundaryDate = seriesEndDate
    ? new Date(seriesEndDate)
    : currentIterationDateCursor

  // Requirement: Logical time conflict prevention (Minimum 30 mins lead time)
  const minimumAllowedFutureBuffer = addMinutes(new Date(), 30)

  while (currentIterationDateCursor <= scheduleStopBoundaryDate) {
    let isCurrentDayAMatchingDate = false

    // A. Logic for DAILY repeat
    if (recurrenceType === "daily") {
      const totalDaysSinceStart = differenceInDays(
        currentIterationDateCursor,
        new Date(seriesStartDate),
      )
      if (totalDaysSinceStart % repeatEveryXWeeksOrDays === 0)
        isCurrentDayAMatchingDate = true
    }

    // B. Logic for WEEKLY or CUSTOM repeat
    else if (recurrenceType === "weekly" || recurrenceType === "custom") {
      const totalWeeksSinceStart = differenceInWeeks(
        currentIterationDateCursor,
        new Date(seriesStartDate),
      )
      // Check if we match the "Every X Weeks" interval AND the correct weekday
      if (
        totalWeeksSinceStart % repeatEveryXWeeksOrDays === 0 &&
        selectedWeekdays.includes(currentIterationDateCursor.getDay())
      ) {
        isCurrentDayAMatchingDate = true
      }
    }

    // C. Logic for MONTHLY repeat
    else if (recurrenceType === "monthly") {
      if (selectedMonthDays.includes(currentIterationDateCursor.getDate()))
        isCurrentDayAMatchingDate = true
    }

    // D. Logic for NO RECURRENCE (Single Event)
    else if (recurrenceType === "none") {
      isCurrentDayAMatchingDate = true
    }

    // IF MATCH: Add all time slots for this specific day
    if (isCurrentDayAMatchingDate) {
      dailyTimeSlots.forEach((timeSlot: any) => {
        const generatedDateTimePair = combineDateWithTime(
          currentIterationDateCursor,
          timeSlot.startTime24h,
          timeSlot.endTime24h,
        )

        // EDGE CASE: Ensure we aren't scheduling something in the past
        if (
          generatedDateTimePair.sessionStartDateTime >=
          minimumAllowedFutureBuffer
        ) {
          finalGeneratedSessions.push(generatedDateTimePair)
        }
      })
    }

    // Move the cursor to the next day
    currentIterationDateCursor = new Date(
      currentIterationDateCursor.setDate(
        currentIterationDateCursor.getDate() + 1,
      ),
    )

    // If it's a one-time class, kill the loop immediately
    if (recurrenceType === "none") break
  }

  return finalGeneratedSessions
}

/**
 * HELPER: combineDateWithTime
 * Why: Merges a "Day" (Date object) with "Clock Time" (String).
 * Explicitly returns the property names requested by the interface.
 */
function combineDateWithTime(
  baseDate: Date,
  startTime24h: string,
  endTime24h: string,
): RequiredSessionStructure {
  const [startHour, startMinute] = startTime24h.split(":").map(Number)
  const [endHour, endMinute] = endTime24h.split(":").map(Number)

  const startDateTimeObject = new Date(baseDate)
  startDateTimeObject.setHours(startHour, startMinute, 0, 0)

  const endDateTimeObject = new Date(baseDate)
  endDateTimeObject.setHours(endHour, endMinute, 0, 0)

  return {
    sessionStartDateTime: startDateTimeObject,
    sessionEndDateTime: endDateTimeObject,
  }
}
