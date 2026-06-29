"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

import { BookingDialog } from "@/components/booking-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type {
  CreateBookingInput,
  UpdateBookingInput,
} from "@/hooks/use-local-bookings"
import {
  TIME_SLOTS,
  buildDaySlotMaps,
  formatTimeRange,
  formatTimeSlot,
  getCompanyLabel,
  getOrderedSlotRange,
  getResizeSlotCount,
  getSlotsForBooking,
} from "@/lib/constants"
import type { TimeSlot } from "@/lib/constants"
import type { Booking } from "@/lib/types"
import {
  formatWeekRange,
  formatWeekday,
  getWeekdayDates,
  shiftWeek,
  toDateKey,
} from "@/lib/week"
import { cn } from "@/lib/utils"

type TimetableShellProps = {
  weekStart: Date
  bookings: Booking[] | undefined
  createBooking: (input: CreateBookingInput) => Promise<void>
  updateBooking: (input: UpdateBookingInput) => Promise<void>
  removeBooking: (id: string) => Promise<void>
  isLocal?: boolean
}

type SlotSelection = {
  slotDate: string
  slotTime: TimeSlot
  slotCount: number
  booking?: Booking
}

type DragPreview = {
  slotDate: string
  startTime: TimeSlot
  endTime: TimeSlot
}

type ResizePreview = {
  booking: Booking
  slotCount: number
}

function companyBadgeVariant(company: string) {
  if (company === "nilo") {
    return "default" as const
  }
  if (company === "first-plug") {
    return "secondary" as const
  }
  return "outline" as const
}

function isSlotInPreview(
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

export function TimetableShell({
  weekStart,
  bookings,
  createBooking,
  updateBooking,
  removeBooking,
  isLocal = false,
}: TimetableShellProps) {
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)
  const dragPreviewRef = useRef<DragPreview | null>(null)
  const resizePreviewRef = useRef<ResizePreview | null>(null)

  const weekDays = useMemo(() => getWeekdayDates(weekStart), [weekStart])
  const previousWeek = shiftWeek(weekStart, -1)
  const nextWeek = shiftWeek(weekStart, 1)

  const daySlotMaps = useMemo(() => {
    const maps = new Map<
      string,
      ReturnType<typeof buildDaySlotMaps<Booking>>
    >()

    for (const day of weekDays) {
      const slotDate = toDateKey(day)
      maps.set(slotDate, buildDaySlotMaps<Booking>(bookings ?? [], slotDate))
    }

    return maps
  }, [bookings, weekDays])

  useEffect(() => {
    dragPreviewRef.current = dragPreview
  }, [dragPreview])

  useEffect(() => {
    resizePreviewRef.current = resizePreview
  }, [resizePreview])

  useEffect(() => {
    function stopPointerInteraction() {
      if (isResizingRef.current) {
        const preview = resizePreviewRef.current
        isResizingRef.current = false
        setResizePreview(null)

        if (preview && preview.slotCount !== preview.booking.slotCount) {
          void updateBooking({
            id: preview.booking.id,
            slotCount: preview.slotCount,
          })
        }

        return
      }

      const preview = dragPreviewRef.current

      if (!isDraggingRef.current || !preview) {
        isDraggingRef.current = false
        setDragPreview(null)
        return
      }

      const dayMaps = daySlotMaps.get(preview.slotDate)
      const { startTime, slotCount } = getOrderedSlotRange(
        preview.startTime,
        preview.endTime
      )
      const slots = getSlotsForBooking(startTime, slotCount)
      const overlaps = slots.some((slotTime) =>
        dayMaps?.occupiedSlots.has(slotTime)
      )

      isDraggingRef.current = false
      setDragPreview(null)

      if (!overlaps) {
        setSelection({
          slotDate: preview.slotDate,
          slotTime: startTime,
          slotCount,
        })
      }
    }

    window.addEventListener("pointerup", stopPointerInteraction)
    return () => window.removeEventListener("pointerup", stopPointerInteraction)
  }, [daySlotMaps, updateBooking])

  function handleSlotPointerDown(
    slotDate: string,
    slotTime: TimeSlot,
    occupiedSlots: Set<string>
  ) {
    if (isResizingRef.current || occupiedSlots.has(slotTime)) {
      return
    }

    isDraggingRef.current = true
    setDragPreview({
      slotDate,
      startTime: slotTime,
      endTime: slotTime,
    })
  }

  function handleSlotPointerEnter(
    slotDate: string,
    slotTime: TimeSlot,
    dayMaps: ReturnType<typeof buildDaySlotMaps<Booking>>
  ) {
    if (isResizingRef.current && resizePreviewRef.current) {
      const preview = resizePreviewRef.current
      const slotCount = getResizeSlotCount(
        preview.booking,
        slotTime,
        dayMaps.slotToBooking
      )

      setResizePreview({
        booking: preview.booking,
        slotCount,
      })
      return
    }

    if (!isDraggingRef.current || !dragPreview || dragPreview.slotDate !== slotDate) {
      return
    }

    const { startTime, endTime, slotCount } = getOrderedSlotRange(
      dragPreview.startTime,
      slotTime
    )
    const slots = getSlotsForBooking(startTime, slotCount)
    const overlaps = slots.some((candidate) =>
      dayMaps.occupiedSlots.has(candidate)
    )

    if (overlaps) {
      return
    }

    setDragPreview({
      slotDate,
      startTime: dragPreview.startTime,
      endTime,
    })
  }

  function handleResizePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    booking: Booking
  ) {
    event.preventDefault()
    event.stopPropagation()

    isResizingRef.current = true
    setResizePreview({
      booking,
      slotCount: booking.slotCount,
    })
  }

  function handleBookedSlotClick(booking: Booking) {
    if (isResizingRef.current) {
      return
    }

    setSelection({
      slotDate: booking.slotDate,
      slotTime: booking.slotTime as TimeSlot,
      slotCount: booking.slotCount,
      booking,
    })
  }

  if (bookings === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        {isLocal ? (
          <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Local mode — bookings are stored in this browser only. Run{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              npm run dev
            </code>{" "}
            to connect Convex.
          </div>
        ) : null}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-medium tracking-tight">Conference room</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/?week=${toDateKey(previousWeek)}`} />}
            >
              Previous
            </Button>
            <span className="min-w-36 text-center text-sm text-muted-foreground">
              {formatWeekRange(weekStart)}
            </span>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/?week=${toDateKey(nextWeek)}`} />}
            >
              Next
            </Button>
          </div>
        </header>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="w-20 px-3 py-2 text-left font-medium text-muted-foreground">
                  Time
                </th>
                {weekDays.map((day) => (
                  <th
                    key={toDateKey(day)}
                    className="px-3 py-2 text-left font-medium"
                  >
                    <div className="flex flex-col">
                      <span>{formatWeekday(day)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {day.getDate()}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slotTime) => (
                <tr key={slotTime} className="h-6 border-b last:border-b-0">
                  <td className="px-3 py-0.5 align-top text-xs text-muted-foreground">
                    {slotTime.endsWith(":00") ? formatTimeSlot(slotTime) : ""}
                  </td>
                  {weekDays.map((day) => {
                    const slotDate = toDateKey(day)
                    const dayMaps = daySlotMaps.get(slotDate)

                    if (!dayMaps) {
                      return null
                    }

                    const resizeForDay =
                      resizePreview?.booking.slotDate === slotDate
                        ? resizePreview
                        : null
                    const previewSlots = resizeForDay
                      ? getSlotsForBooking(
                          resizeForDay.booking.slotTime,
                          resizeForDay.slotCount
                        )
                      : []
                    const isPreviewContinuation =
                      resizeForDay !== null &&
                      previewSlots.includes(slotTime) &&
                      previewSlots[0] !== slotTime

                    if (
                      dayMaps.continuationSlots.has(slotTime) ||
                      isPreviewContinuation
                    ) {
                      return null
                    }

                    const booking = dayMaps.startBySlot.get(slotTime)
                    const isPreviewStart =
                      resizeForDay?.booking.slotTime === slotTime
                    const displayBooking =
                      booking ?? (isPreviewStart ? resizeForDay?.booking : undefined)
                    const slotCount =
                      isPreviewStart && resizeForDay
                        ? resizeForDay.slotCount
                        : booking?.slotCount ?? 1
                    const previewActive = isSlotInPreview(
                      slotDate,
                      slotTime,
                      dragPreview
                    )
                    const resizeActive =
                      resizeForDay !== null &&
                      displayBooking?.id === resizeForDay.booking.id

                    return (
                      <td
                        key={`${slotDate}_${slotTime}`}
                        rowSpan={displayBooking ? slotCount : 1}
                        className={cn(
                          "p-0.5 align-top",
                          displayBooking && "relative h-px"
                        )}
                      >
                        {displayBooking ? (
                          <div
                            className={cn(
                              "absolute inset-0.5 flex flex-col rounded-md border bg-muted/20",
                              resizeActive
                                ? "border-primary/40 ring-1 ring-primary/20"
                                : "border-border"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleBookedSlotClick(displayBooking)}
                              className="flex min-h-0 flex-1 flex-col gap-1 px-2 py-1 text-left"
                            >
                              <span className="truncate text-sm font-medium">
                                {displayBooking.name}
                              </span>
                              <Badge
                                variant={companyBadgeVariant(displayBooking.company)}
                                className="w-fit"
                              >
                                {getCompanyLabel(displayBooking.company)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeRange(
                                  displayBooking.slotTime,
                                  slotCount
                                )}
                              </span>
                              {displayBooking.note ? (
                                <span className="line-clamp-3 text-xs text-muted-foreground">
                                  {displayBooking.note}
                                </span>
                              ) : null}
                            </button>
                            <div
                              aria-label="Drag to extend booking"
                              onPointerDown={(event) =>
                                handleResizePointerDown(event, displayBooking)
                              }
                              className="absolute inset-x-1 bottom-0 z-10 h-2.5 shrink-0 cursor-ns-resize rounded-b-md hover:bg-primary/30 active:bg-primary/40"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onPointerDown={() =>
                              handleSlotPointerDown(
                                slotDate,
                                slotTime,
                                dayMaps.occupiedSlots
                              )
                            }
                            onPointerEnter={() =>
                              handleSlotPointerEnter(
                                slotDate,
                                slotTime,
                                dayMaps
                              )
                            }
                            className={cn(
                              "block h-6 w-full rounded-md border border-transparent transition-colors hover:bg-muted/50",
                              previewActive &&
                                "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                            )}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BookingDialog
        selection={selection}
        onClose={() => setSelection(null)}
        createBooking={createBooking}
        removeBooking={removeBooking}
      />
    </>
  )
}
