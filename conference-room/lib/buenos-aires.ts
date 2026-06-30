export const BUENOS_AIRES_TIME_ZONE = "America/Argentina/Buenos_Aires"

const PARTS_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUENOS_AIRES_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: BUENOS_AIRES_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
})

export type BuenosAiresNow = {
  /** Minutes since midnight in Buenos Aires. */
  minutes: number
  /** Calendar date in Buenos Aires as `YYYY-MM-DD`. */
  dateKey: string
  /** Human time label, e.g. "8:46 PM". */
  label: string
}

export function getBuenosAiresNow(date: Date = new Date()): BuenosAiresNow {
  const parts = PARTS_FORMAT.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00"

  // en-CA reports midnight as hour "24"; normalize to 0.
  const hour = Number(read("hour")) % 24
  const minutes = hour * 60 + Number(read("minute"))
  const dateKey = `${read("year")}-${read("month")}-${read("day")}`

  return { minutes, dateKey, label: LABEL_FORMAT.format(date) }
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

/** Calendar date in Buenos Aires for any instant. */
export function toBuenosAiresDateKey(date: Date = new Date()) {
  return getBuenosAiresNow(date).dateKey
}

/** Stable Date at UTC noon for a `YYYY-MM-DD` calendar key. */
export function dateKeyToDate(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const { year, month, day } = parseDateKey(dateKey)
  return formatDateKeyFromUtc(new Date(Date.UTC(year, month - 1, day + days)))
}

function getWeekdayFromDateKey(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/** Monday of the week containing `dateKey`. */
export function startOfWeekDateKey(dateKey: string) {
  const weekday = getWeekdayFromDateKey(dateKey)
  const diff = weekday === 0 ? -6 : 1 - weekday
  return addDaysToDateKey(dateKey, diff)
}
