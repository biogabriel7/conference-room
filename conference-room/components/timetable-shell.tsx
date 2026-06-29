"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

import { BookingDialog } from "@/components/booking-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { CreateBookingInput } from "@/hooks/use-local-bookings"
import {
  COMPANIES,
  TIME_SLOTS,
  buildDaySlotMaps,
  formatTimeRange,
  formatTimeSlot,
  getCompanyLabel,
  getOrderedSlotRange,
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
  removeBooking,
  isLocal = false,
}: TimetableShellProps) {
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const isDraggingRef = useRef(false)
  const dragPreviewRef = useRef<DragPreview | null>(null)

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
    function stopDragging() {
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

    window.addEventListener("pointerup", stopDragging)
    return () => window.removeEventListener("pointerup", stopDragging)
  }, [daySlotMaps])

  function handleSlotPointerDown(
    slotDate: string,
    slotTime: TimeSlot,
    occupiedSlots: Set<string>
  ) {
    if (occupiedSlots.has(slotTime)) {
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
    occupiedSlots: Set<string>
  ) {
    if (!isDraggingRef.current || !dragPreview || dragPreview.slotDate !== slotDate) {
      return
    }

    const { startTime, endTime, slotCount } = getOrderedSlotRange(
      dragPreview.startTime,
      slotTime
    )
    const slots = getSlotsForBooking(startTime, slotCount)
    const overlaps = slots.some((candidate) => occupiedSlots.has(candidate))

    if (overlaps) {
      return
    }

    setDragPreview({
      slotDate,
      startTime: dragPreview.startTime,
      endTime,
    })
  }

  function handleBookedSlotClick(booking: Booking) {
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
            <p className="text-sm text-muted-foreground">
              Nilo · First Plug · Volantis
            </p>
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

        <div className="flex flex-wrap gap-3">
          {COMPANIES.map((company) => (
            <Badge key={company.id} variant={companyBadgeVariant(company.id)}>
              {company.label}
            </Badge>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Click and drag on empty slots to book multiple 20-minute blocks.
        </p>

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
                <tr key={slotTime} className="border-b last:border-b-0">
                  <td className="px-3 py-1 align-top text-xs text-muted-foreground">
                    {slotTime.endsWith(":00") ? formatTimeSlot(slotTime) : ""}
                  </td>
                  {weekDays.map((day) => {
                    const slotDate = toDateKey(day)
                    const dayMaps = daySlotMaps.get(slotDate)

                    if (!dayMaps || dayMaps.continuationSlots.has(slotTime)) {
                      return null
                    }

                    const booking = dayMaps.startBySlot.get(slotTime)
                    const slotCount = booking?.slotCount ?? 1
                    const previewActive = isSlotInPreview(
                      slotDate,
                      slotTime,
                      dragPreview
                    )

                    return (
                      <td
                        key={`${slotDate}_${slotTime}`}
                        rowSpan={booking ? slotCount : 1}
                        className="p-0.5 align-top"
                      >
                        <button
                          type="button"
                          onPointerDown={() => {
                            if (booking) {
                              handleBookedSlotClick(booking)
                              return
                            }

                            handleSlotPointerDown(
                              slotDate,
                              slotTime,
                              dayMaps.occupiedSlots
                            )
                          }}
                          onPointerEnter={() => {
                            if (booking) {
                              return
                            }

                            handleSlotPointerEnter(
                              slotDate,
                              slotTime,
                              dayMaps.occupiedSlots
                            )
                          }}
                          className={cn(
                            "flex h-full min-h-8 w-full flex-col gap-1 rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:bg-muted/50",
                            booking && "border-border bg-muted/20",
                            previewActive &&
                              "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
                          )}
                        >
                          {booking ? (
                            <>
                              <span className="truncate text-sm font-medium">
                                {booking.name}
                              </span>
                              <Badge
                                variant={companyBadgeVariant(booking.company)}
                                className="w-fit"
                              >
                                {getCompanyLabel(booking.company)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeRange(booking.slotTime, booking.slotCount)}
                              </span>
                              {booking.note ? (
                                <span className="truncate text-xs text-muted-foreground">
                                  {booking.note}
                                </span>
                              ) : null}
                            </>
                          ) : null}
                        </button>
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
