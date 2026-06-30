export const COMPANIES = [
  { id: "nilo", label: "Nilo" },
  { id: "first-plug", label: "First Plug" },
  { id: "volantis", label: "Volantis" },
] as const

export type CompanyId = (typeof COMPANIES)[number]["id"]

const COMPANY_LABELS = new Map<string, string>(
  COMPANIES.map((company) => [company.id, company.label])
)

export {
  TIME_SLOTS,
  SLOT_DURATION_MINUTES,
  formatTimeSlot,
  formatTimeRange,
  getOrderedSlotRange,
  getSlotCount,
  getSlotsForBooking,
  buildDaySlotMaps,
  canPlaceBookingAt,
  getResizeSlotCount,
} from "@/lib/time-slots"

export type { TimeSlot } from "@/lib/time-slots"

export function getCompanyLabel(companyId: string) {
  return COMPANY_LABELS.get(companyId) ?? companyId
}
