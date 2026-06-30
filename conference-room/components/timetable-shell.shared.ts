import {
  getOrderedSlotRange,
  getSlotsForBooking,
} from "@/lib/constants"
import type { TimeSlot } from "@/lib/constants"
import type { Booking } from "@/lib/types"

export type DragPreview = {
  slotDate: string
  startTime: TimeSlot
  endTime: TimeSlot
}

export type ResizePreview = {
  booking: Booking
  slotCount: number
}

export type MovePreview = {
  booking: Booking
  slotDate: string
  slotTime: TimeSlot
}

export const TIME_COLUMN_HEADER_CLASS =
  "sticky left-0 z-30 w-10 shrink-0 border-r border-border/80 bg-muted/70 px-1 py-2 text-left text-[10px] font-medium uppercase tracking-widest text-muted-foreground shadow-[4px_0_16px_-8px_rgba(0,0,0,0.12)] dark:shadow-[4px_0_16px_-8px_rgba(0,0,0,0.45)]"

export const TIME_COLUMN_CELL_CLASS =
  "sticky left-0 z-20 w-10 shrink-0 border-r border-border/80 bg-muted/50 px-1 py-0.5 align-top text-center font-mono text-[11px] font-medium leading-none tabular-nums tracking-tight text-foreground/90"

export const SLOT_TARGET_SELECTOR = "[data-slot-date][data-slot-time]"

export function resolveSlotAtPoint(clientX: number, clientY: number) {
  const element = document.elementFromPoint(clientX, clientY)

  if (!element) {
    return null
  }

  const slotTarget = element.closest(SLOT_TARGET_SELECTOR)

  if (!slotTarget) {
    return null
  }

  const slotDate = slotTarget.getAttribute("data-slot-date")
  const slotTime = slotTarget.getAttribute("data-slot-time")

  if (!slotDate || !slotTime) {
    return null
  }

  return { slotDate, slotTime: slotTime as TimeSlot }
}

export function isSlotInPreview(
  slotDate: string,
  slotTime: TimeSlot,
  preview: DragPreview | null
) {
  if (!preview || preview.slotDate !== slotDate) {
    return false
  }

  const { startTime, slotCount } = getOrderedSlotRange(
    preview.startTime,
    preview.endTime
  )
  const slots = getSlotsForBooking(startTime, slotCount)

  return slots.includes(slotTime)
}

export { getOrderedSlotRange, getSlotsForBooking }
