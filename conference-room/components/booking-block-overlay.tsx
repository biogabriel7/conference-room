import { BookingBlockFace } from "@/components/booking-block-face"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import {
  BOOKING_BLOCK_MOTION,
  getBookingBlockRect,
  type SlotMetrics,
} from "@/lib/booking-block-motion"
import type { TimeSlot } from "@/lib/constants"
import { getSlotIndex } from "@/lib/time-slots"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

type BookingBlockOverlayProps = {
  booking: Booking
  slotDate: string
  slotTime: TimeSlot
  slotCount: number
  metrics: SlotMetrics
  active?: boolean
}

export function BookingBlockOverlay({
  booking,
  slotDate,
  slotTime,
  slotCount,
  metrics,
  active = true,
}: BookingBlockOverlayProps) {
  const prefersReducedMotion = usePrefersReducedMotion()

  const rect = getBookingBlockRect(
    metrics,
    slotDate,
    getSlotIndex(slotTime),
    slotCount
  )

  if (!rect) {
    return null
  }

  const { durationMs, ease, overlayZIndex } = BOOKING_BLOCK_MOTION

  // Drive position with `transform` (GPU, no layout) instead of top/left so
  // moving a block across the grid stays smooth even under main-thread load.
  // Only height/width fall back to layout transitions, and those change at
  // most once per resize.
  const transition = prefersReducedMotion
    ? "none"
    : [
        `transform ${durationMs}ms ${ease}`,
        `height ${durationMs}ms ${ease}`,
        `width ${durationMs}ms ${ease}`,
      ].join(", ")

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-0 left-0 flex flex-col rounded-md border bg-muted/20 shadow-lg",
        active ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
      )}
      style={{
        width: rect.width,
        height: rect.height,
        transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
        willChange: "transform",
        zIndex: overlayZIndex,
        transition,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-1 px-2 py-1 text-left">
        <BookingBlockFace
          booking={booking}
          slotTime={slotTime}
          slotCount={slotCount}
        />
      </div>
      <div className="absolute inset-x-1 bottom-0 h-2.5 shrink-0 rounded-b-md bg-primary/20" />
    </div>
  )
}
