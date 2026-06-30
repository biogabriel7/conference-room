export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function getWeekdayDates(weekStart: Date) {
  return Array.from({ length: 5 }, (_, index) => {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + index)
    return day
  })
}

const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" })
const dayFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
})
const weekStartFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
})
const weekEndFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function formatWeekday(date: Date) {
  return weekdayFormatter.format(date)
}

export function formatDay(date: Date) {
  return dayFormatter.format(date)
}

export function formatWeekRange(weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 4)

  return `${weekStartFormatter.format(weekStart)} – ${weekEndFormatter.format(weekEnd)}`
}

export function getCurrentWeekStart() {
  return startOfWeek(new Date())
}

export function clampWeekStart(weekStart: Date) {
  const currentWeekStart = getCurrentWeekStart()

  if (weekStart.getTime() < currentWeekStart.getTime()) {
    return currentWeekStart
  }

  return weekStart
}

export function parseWeekParam(value: string | undefined) {
  if (!value) {
    return getCurrentWeekStart()
  }

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return getCurrentWeekStart()
  }

  return clampWeekStart(startOfWeek(parsed))
}

export function shiftWeek(weekStart: Date, direction: -1 | 1) {
  const next = new Date(weekStart)
  next.setDate(weekStart.getDate() + direction * 7)
  return next
}
