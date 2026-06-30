import type { BuenosAiresNow } from "@/lib/buenos-aires"
import { timeToMinutes } from "@/lib/time-slots"

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

export function getBookingErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Something went wrong."
}
