export const COMPANIES = [
  { id: "nilo", label: "Nilo" },
  { id: "first-plug", label: "First Plug" },
  { id: "volantis", label: "Volantis" },
] as const

export type CompanyId = (typeof COMPANIES)[number]["id"]

export const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
] as const

export type TimeSlot = (typeof TIME_SLOTS)[number]

export function formatTimeSlot(time: string) {
  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours, 10)
  const suffix = hour >= 12 ? "pm" : "am"
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${displayHour}:${minutes}${suffix}`
}

export function getCompanyLabel(companyId: string) {
  return COMPANIES.find((company) => company.id === companyId)?.label ?? companyId
}
