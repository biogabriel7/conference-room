"use client"

import type { SlotMetrics } from "@/lib/booking-block-motion"
import { useBuenosAiresNow } from "@/hooks/use-buenos-aires-now"
import { SLOT_DURATION_MINUTES, TIME_SLOTS } from "@/lib/constants"

const DAY_START_MINUTES = 8 * 60

type TimetableNowLineProps = {
  metrics: SlotMetrics
  weekDateKeys: string[]
}

export function TimetableNowLine({
  metrics,
  weekDateKeys,
}: TimetableNowLineProps) {
  const now = useBuenosAiresNow()

  // Only show the indicator on the week that actually contains "today" in
  // Buenos Aires — a now-line on a past or future week would be misleading.
  if (!weekDateKeys.includes(now.dateKey)) {
    return null
  }

  // Map the current minute onto the grid. Before 8am clamps to the top edge,
  // after 6pm clamps to the bottom edge.
  const rawIndex = (now.minutes - DAY_START_MINUTES) / SLOT_DURATION_MINUTES
  const index = Math.max(0, Math.min(rawIndex, TIME_SLOTS.length))
  const top = metrics.bodyTop + index * metrics.rowHeight

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-30"
      style={{ top }}
    >
      <span className="absolute left-0 w-10 -translate-y-1/2 pr-1 text-right font-mono text-[10px] font-semibold leading-none tabular-nums text-red-500">
        {now.label}
      </span>
      <span className="absolute left-10 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
      <span className="absolute right-0 left-10 h-px -translate-y-1/2 bg-red-500" />
    </div>
  )
}
