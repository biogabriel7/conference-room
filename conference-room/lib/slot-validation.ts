import type { BuenosAiresNow } from "@/lib/buenos-aires"
import { getBuenosAiresNow } from "@/lib/buenos-aires"
import { timeToMinutes } from "@/lib/time-slots"

/** After create or move, allow undo (delete / reposition) even if the slot is now past. */
export const BOOKING_GRACE_PERIOD_MS = 30_000

export type BookingTimestamps = {
  createdAt: string
  slotChangedAt?: string
}

export function isPastSlot(
  slotDate: string,
  slotTime: string,
  now: BuenosAiresNow
) {
  if (slotDate < now.dateKey) {
    return true
  }

  if (slotDate > now.dateKey) {
    return false
  }

  return timeToMinutes(slotTime) < now.minutes
}

function getBookingGraceAnchorMs(booking: BookingTimestamps) {
  return Math.max(
    Date.parse(booking.createdAt),
    Date.parse(booking.slotChangedAt ?? booking.createdAt)
  )
}

export function isBookingInGracePeriod(
  booking: BookingTimestamps,
  at = Date.now()
) {
  return at - getBookingGraceAnchorMs(booking) <= BOOKING_GRACE_PERIOD_MS
}

/** Whether a slot should be blocked for booking or moving into. */
export function isPastSlotBlocked(
  slotDate: string,
  slotTime: string,
  now: BuenosAiresNow,
  booking?: BookingTimestamps | null
) {
  if (!isPastSlot(slotDate, slotTime, now)) {
    return false
  }

  if (booking && isBookingInGracePeriod(booking)) {
    return false
  }

  return true
}

export function assertNotPastSlotForCreate(
  slotDate: string,
  slotTime: string,
  now = getBuenosAiresNow()
) {
  if (isPastSlotBlocked(slotDate, slotTime, now)) {
    throw new Error("That time slot is in the past.")
  }
}

export function assertNotPastSlotForBookingMove(
  slotDate: string,
  slotTime: string,
  booking: BookingTimestamps,
  now = getBuenosAiresNow()
) {
  if (isPastSlotBlocked(slotDate, slotTime, now, booking)) {
    throw new Error("That time slot is in the past.")
  }
}

export function getBookingErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Something went wrong."
}
