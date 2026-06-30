"use client"

import { memo } from "react"

import { BookingBlockFace } from "@/components/booking-block-face"
import { buildDaySlotMaps, formatTimeSlot, getBookingBlockLabel, getCompanyBlockClassName, getCompanyCompactBlockClassName, getCompanyHandleClassName, getSlotsForBooking } from "@/lib/constants"
import type { TimeSlot } from "@/lib/constants"
import type { SlotMetrics } from "@/lib/booking-block-motion"
import type { Booking } from "@/lib/types"
import type { BuenosAiresNow } from "@/lib/buenos-aires"
import { isPastSlotBlocked } from "@/lib/slot-validation"
import { toDateKey } from "@/lib/week"
import { cn } from "@/lib/utils"

import {
  isSlotInPreview,
  TIME_COLUMN_CELL_CLASS,
  type DragPreview,
  type MovePreview,
} from "@/components/timetable-shell.shared"

type DaySlotMaps = ReturnType<typeof buildDaySlotMaps<Booking>>

type TimetableRowProps = {
  slotTime: TimeSlot
  slotRowIndex: number
  weekDays: Date[]
  todayKey: string
  now: BuenosAiresNow
  daySlotMaps: Map<string, DaySlotMaps>
  dragPreview: DragPreview | null
  movePreview: MovePreview | null
  metrics: SlotMetrics | null
  registerDayColumn: (slotDate: string, node: HTMLTableCellElement | null) => void
  onSlotPointerDown: (
    slotDate: string,
    slotTime: TimeSlot,
    occupiedSlots: Set<string>
  ) => void
  onSlotPointerEnter: (
    slotDate: string,
    slotTime: TimeSlot,
    dayMaps: DaySlotMaps
  ) => void
  onMovePointerDown: (
    event: React.PointerEvent<HTMLButtonElement>,
    booking: Booking
  ) => void
  onResizePointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
    booking: Booking
  ) => void
}

const ROW_CLASS =
  "h-6 [content-visibility:auto] [contain-intrinsic-size:0_1.5rem]"

export const TimetableRow = memo(function TimetableRow({
  slotTime,
  slotRowIndex,
  weekDays,
  todayKey,
  now,
  daySlotMaps,
  dragPreview,
  movePreview,
  metrics,
  registerDayColumn,
  onSlotPointerDown,
  onSlotPointerEnter,
  onMovePointerDown,
  onResizePointerDown,
}: TimetableRowProps) {
  const isHourStart = slotTime.endsWith(":00")
  // Horizontal grid line at the top of each slot: hour starts get a prominent
  // line, the 15-minute slots a softer grey. The first row is skipped so the
  // line doesn't double up against the header border.
  const gridLine =
    slotRowIndex === 0
      ? null
      : isHourStart
        ? "border-t border-t-foreground/30"
        : "border-t border-t-foreground/10"

  return (
    <tr className={ROW_CLASS}>
      <td className={cn(TIME_COLUMN_CELL_CLASS, gridLine)}>
        {isHourStart ? formatTimeSlot(slotTime) : ""}
      </td>
      {weekDays.map((day, dayIndex) => {
        const slotDate = toDateKey(day)
        const dayMaps = daySlotMaps.get(slotDate)

        if (!dayMaps) {
          return null
        }

        const moveForDay =
          movePreview?.slotDate === slotDate ? movePreview : null
        const movePreviewSlots = moveForDay
          ? getSlotsForBooking(
              moveForDay.slotTime,
              moveForDay.booking.slotCount
            )
          : []
        const isMoveContinuation =
          moveForDay !== null &&
          movePreviewSlots.includes(slotTime) &&
          movePreviewSlots[0] !== slotTime

        if (dayMaps.continuationSlots.has(slotTime) || isMoveContinuation) {
          return null
        }

        const booking = dayMaps.startBySlot.get(slotTime)
        const isMovePreviewStart = moveForDay?.slotTime === slotTime
        const displayBooking =
          booking ?? (isMovePreviewStart ? moveForDay?.booking : undefined)
        const slotCount = isMovePreviewStart
          ? moveForDay!.booking.slotCount
          : (booking?.slotCount ?? 1)
        const isCompact = slotCount === 1
        const blockLabel = displayBooking
          ? getBookingBlockLabel(displayBooking, displayBooking.slotTime, slotCount)
          : undefined
        const previewActive = isSlotInPreview(slotDate, slotTime, dragPreview)
        const moveActive =
          moveForDay !== null && displayBooking?.id === moveForDay.booking.id
        const useOverlay = moveActive && Boolean(metrics)
        const slotIsPast = isPastSlotBlocked(slotDate, slotTime, now)

        return (
          <td
            key={`${slotDate}_${slotTime}`}
            ref={
              slotRowIndex === 0
                ? (node) => registerDayColumn(slotDate, node)
                : undefined
            }
            rowSpan={displayBooking ? slotCount : 1}
            className={cn(
              "p-0.5 align-top",
              slotDate === todayKey ? "bg-foreground/[0.05]" : "bg-background",
              gridLine,
              dayIndex > 0 && "border-l border-l-border/40",
              displayBooking && "relative h-px"
            )}
          >
            {displayBooking ? (
              useOverlay ? (
                <div
                  aria-hidden
                  className="absolute inset-0.5 rounded-md border border-dashed border-primary/25 bg-primary/5"
                />
              ) : (
                <div
                  className={cn(
                    "absolute inset-0.5 flex flex-col rounded-md",
                    isCompact
                      ? getCompanyCompactBlockClassName(displayBooking.company)
                      : cn("border", getCompanyBlockClassName(displayBooking.company))
                  )}
                  title={isCompact ? blockLabel : undefined}
                >
                  <button
                    type="button"
                    onPointerDown={(event) =>
                      onMovePointerDown(event, displayBooking)
                    }
                    onPointerEnter={() =>
                      onSlotPointerEnter(slotDate, slotTime, dayMaps)
                    }
                    aria-label={blockLabel}
                    className={cn(
                      "cursor-grab text-left active:cursor-grabbing",
                      isCompact
                        ? "absolute inset-0 rounded-md"
                        : "flex min-h-0 flex-1 flex-col gap-1 px-2 py-1"
                    )}
                  >
                    {!isCompact ? (
                      <BookingBlockFace
                        booking={displayBooking}
                        slotTime={displayBooking.slotTime}
                        slotCount={slotCount}
                      />
                    ) : null}
                  </button>
                  <div
                    aria-label="Drag to extend booking"
                    onPointerDown={(event) =>
                      onResizePointerDown(event, displayBooking)
                    }
                    className={cn(
                      "absolute inset-x-0 bottom-0 z-10 shrink-0 cursor-ns-resize",
                      isCompact
                        ? "h-1"
                        : cn(
                            "inset-x-1 h-2.5 rounded-b-md transition-colors",
                            getCompanyHandleClassName(displayBooking.company)
                          )
                    )}
                  />
                </div>
              )
            ) : (
              <button
                type="button"
                disabled={slotIsPast}
                onPointerDown={() =>
                  onSlotPointerDown(slotDate, slotTime, dayMaps.occupiedSlots)
                }
                onPointerEnter={() =>
                  onSlotPointerEnter(slotDate, slotTime, dayMaps)
                }
                className={cn(
                  "block h-6 w-full rounded-md border border-transparent transition-colors",
                  slotIsPast
                    ? "cursor-not-allowed opacity-40"
                    : "hover:bg-muted/50",
                  previewActive &&
                    "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                )}
              />
            )}
          </td>
        )
      })}
    </tr>
  )
})
