import {
  addDaysToDateKey,
  BUENOS_AIRES_TIME_ZONE,
  dateKeyToDate,
  getBuenosAiresNow,
  startOfWeekDateKey,
  toBuenosAiresDateKey,
} from "@/lib/buenos-aires"

export function toDateKey(date: Date) {
  return toBuenosAiresDateKey(date)
}

export function startOfWeek(date: Date) {
  return dateKeyToDate(startOfWeekDateKey(toBuenosAiresDateKey(date)))
}

export function getWeekdayDates(weekStart: Date) {
  const startKey = toBuenosAiresDateKey(weekStart)

  return Array.from({ length: 5 }, (_, index) =>
    dateKeyToDate(addDaysToDateKey(startKey, index))
  )
}

const weekdayFormatter = new Intl.DateTimeFormat("en", {
  weekday: "short",
  timeZone: BUENOS_AIRES_TIME_ZONE,
})
const dayFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: BUENOS_AIRES_TIME_ZONE,
})
const weekStartFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: BUENOS_AIRES_TIME_ZONE,
})
const weekEndFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: BUENOS_AIRES_TIME_ZONE,
})

export function formatWeekday(date: Date) {
  return weekdayFormatter.format(date)
}

export function formatDay(date: Date) {
  return dayFormatter.format(date)
}

export function formatWeekRange(weekStart: Date) {
  const weekEnd = dateKeyToDate(
    addDaysToDateKey(toBuenosAiresDateKey(weekStart), 4)
  )

  return `${weekStartFormatter.format(weekStart)} – ${weekEndFormatter.format(weekEnd)}`
}

export function getCurrentWeekStart() {
  return dateKeyToDate(startOfWeekDateKey(getBuenosAiresNow().dateKey))
}

export function isCurrentWeek(weekStart: Date) {
  return (
    toBuenosAiresDateKey(weekStart) ===
    startOfWeekDateKey(getBuenosAiresNow().dateKey)
  )
}

export function clampWeekStart(weekStart: Date) {
  const currentWeekKey = startOfWeekDateKey(getBuenosAiresNow().dateKey)
  const weekKey = startOfWeekDateKey(toBuenosAiresDateKey(weekStart))

  if (weekKey < currentWeekKey) {
    return dateKeyToDate(currentWeekKey)
  }

  return dateKeyToDate(weekKey)
}

export function parseWeekParam(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getCurrentWeekStart()
  }

  return clampWeekStart(dateKeyToDate(startOfWeekDateKey(value)))
}

export function shiftWeek(weekStart: Date, direction: -1 | 1) {
  return dateKeyToDate(
    addDaysToDateKey(toBuenosAiresDateKey(weekStart), direction * 7)
  )
}
