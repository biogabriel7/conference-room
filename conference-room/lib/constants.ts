export const COMPANIES = [
  { id: "nilo", label: "Nilo" },
  { id: "first-plug", label: "First Plug" },
  { id: "volantis", label: "Volantis" },
] as const

export type CompanyId = (typeof COMPANIES)[number]["id"]

export {
  TIME_SLOTS,
  SLOT_DURATION_MINUTES,
  formatTimeSlot,
  formatTimeRange,
  getOrderedSlotRange,
  getSlotCount,
  getSlotsForBooking,
  buildDaySlotMaps,
} from "@/lib/time-slots"

export type { TimeSlot } from "@/lib/time-slots"

export function getCompanyLabel(companyId: string) {
  return COMPANIES.find((company) => company.id === companyId)?.label ?? companyId
}
