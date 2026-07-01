import { getSlotsForBooking, timeToMinutes } from "./time-slots"

export type RecurrenceInterval = "none" | "weekly" | "biweekly"
export type RecurrenceEnd =
  "1month" | "3months" | "6months" | "1year" | "52weeks"
export type RecurrenceStatus = "available" | "conflict" | "past"

export type RecurrenceOccurrence = {
  slotDate: string
  status: RecurrenceStatus
}

export type RecurrencePreview = {
  occurrences: RecurrenceOccurrence[]
  summary: {
    total: number
    available: number
    conflict: number
    past: number
  }
}

type BookingLike = {
  slotDate: string
  slotTime: string
  slotCount?: number
}

type RecurrenceNow = {
  dateKey: string
  minutes: number
}

const RECURRENCE_HORIZON_DAYS: Record<RecurrenceEnd, number> = {
  "1month": 30,
  "3months": 91,
  "6months": 182,
  "1year": 364,
  "52weeks": 364,
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number)
  return { year, month, day }
}

function formatDateKeyFromUtc(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function addDaysToDateKey(dateKey: string, days: number) {
  const { year, month, day } = parseDateKey(dateKey)
  return formatDateKeyFromUtc(new Date(Date.UTC(year, month - 1, day + days)))
}

function isPastSlot(slotDate: string, slotTime: string, now: RecurrenceNow) {
  if (slotDate < now.dateKey) {
    return true
  }

  if (slotDate > now.dateKey) {
    return false
  }

  return timeToMinutes(slotTime) < now.minutes
}

export function getRecurrenceHorizonEnd(startDate: string, end: RecurrenceEnd) {
  return addDaysToDateKey(startDate, RECURRENCE_HORIZON_DAYS[end])
}

export function getRecurrenceDates(
  startDate: string,
  intervalWeeks: 1 | 2,
  end: RecurrenceEnd
) {
  const dates: string[] = []
  const stepDays = intervalWeeks * 7
  const horizonEnd = getRecurrenceHorizonEnd(startDate, end)

  for (
    let slotDate = startDate;
    slotDate <= horizonEnd;
    slotDate = addDaysToDateKey(slotDate, stepDays)
  ) {
    dates.push(slotDate)
  }

  return dates
}

function bookingOccupiesSlot(
  booking: BookingLike,
  slotDate: string,
  slotTime: string
) {
  if (booking.slotDate !== slotDate) {
    return false
  }

  return getSlotsForBooking(booking.slotTime, booking.slotCount ?? 1).includes(
    slotTime
  )
}

export function classifyRecurrenceOccurrences(
  slotDates: string[],
  slotTime: string,
  slotCount: number,
  bookings: BookingLike[],
  now: RecurrenceNow
): RecurrencePreview {
  const slots = getSlotsForBooking(slotTime, slotCount)
  const occurrences = slotDates.map((slotDate) => {
    if (isPastSlot(slotDate, slotTime, now)) {
      return { slotDate, status: "past" as const }
    }

    const hasConflict = bookings.some((booking) =>
      slots.some((candidate) =>
        bookingOccupiesSlot(booking, slotDate, candidate)
      )
    )

    return {
      slotDate,
      status: hasConflict ? ("conflict" as const) : ("available" as const),
    }
  })

  return {
    occurrences,
    summary: {
      total: occurrences.length,
      available: occurrences.filter(
        (occurrence) => occurrence.status === "available"
      ).length,
      conflict: occurrences.filter(
        (occurrence) => occurrence.status === "conflict"
      ).length,
      past: occurrences.filter((occurrence) => occurrence.status === "past")
        .length,
    },
  }
}
