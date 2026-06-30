import { formatTimeRange } from "@/lib/time-slots"

export const COMPANIES = [
  { id: "nilo", label: "Nilo" },
  { id: "first-plug", label: "First Plug" },
  { id: "volantis", label: "Volantis" },
] as const

export type CompanyId = (typeof COMPANIES)[number]["id"]

const COMPANY_THEMES: Record<
  CompanyId,
  {
    block: string
    compact: string
    handle: string
    badge: string
  }
> = {
  nilo: {
    block:
      "border-sky-300/80 bg-sky-500/15 dark:border-sky-500/45 dark:bg-sky-500/22",
    compact: "bg-sky-500/45 dark:bg-sky-500/55",
    handle:
      "bg-sky-500/30 hover:bg-sky-500/45 active:bg-sky-500/55 dark:bg-sky-400/35 dark:hover:bg-sky-400/50",
    badge:
      "border-sky-300/70 bg-sky-500/15 text-sky-950 dark:border-sky-500/45 dark:bg-sky-500/25 dark:text-sky-50",
  },
  "first-plug": {
    block:
      "border-amber-300/80 bg-amber-500/15 dark:border-amber-500/45 dark:bg-amber-500/22",
    compact: "bg-amber-500/45 dark:bg-amber-500/55",
    handle:
      "bg-amber-500/30 hover:bg-amber-500/45 active:bg-amber-500/55 dark:bg-amber-400/35 dark:hover:bg-amber-400/50",
    badge:
      "border-amber-300/70 bg-amber-500/15 text-amber-950 dark:border-amber-500/45 dark:bg-amber-500/25 dark:text-amber-50",
  },
  volantis: {
    block:
      "border-violet-300/80 bg-violet-500/15 dark:border-violet-500/45 dark:bg-violet-500/22",
    compact: "bg-violet-500/45 dark:bg-violet-500/55",
    handle:
      "bg-violet-500/30 hover:bg-violet-500/45 active:bg-violet-500/55 dark:bg-violet-400/35 dark:hover:bg-violet-400/50",
    badge:
      "border-violet-300/70 bg-violet-500/15 text-violet-950 dark:border-violet-500/45 dark:bg-violet-500/25 dark:text-violet-50",
  },
}

export function getCompanyBlockClassName(companyId: CompanyId | string) {
  return COMPANY_THEMES[companyId as CompanyId]?.block ?? "border-border bg-muted/20"
}

export function getCompanyCompactBlockClassName(companyId: CompanyId | string) {
  return COMPANY_THEMES[companyId as CompanyId]?.compact ?? "bg-muted"
}

export function getCompanyHandleClassName(companyId: CompanyId | string) {
  return (
    COMPANY_THEMES[companyId as CompanyId]?.handle ??
    "bg-primary/20 hover:bg-primary/30 active:bg-primary/40"
  )
}

export function getCompanyBadgeClassName(companyId: CompanyId | string) {
  return (
    COMPANY_THEMES[companyId as CompanyId]?.badge ??
    "border-border bg-muted text-foreground"
  )
}

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

export function getBookingBlockLabel(
  booking: { name: string; company: string },
  slotTime: string,
  slotCount: number
) {
  return `${booking.name} · ${getCompanyLabel(booking.company)} · ${formatTimeRange(slotTime, slotCount)}`
}
