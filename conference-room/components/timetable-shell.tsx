"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { BookingBlockOverlay } from "@/components/booking-block-overlay"
import { TimetableNowLine } from "@/components/timetable-now-line"
import { TimetableRow } from "@/components/timetable-row"
import { getBuenosAiresNow } from "@/lib/buenos-aires"
import { useBuenosAiresNow } from "@/hooks/use-buenos-aires-now"
import {
  getOrderedSlotRange,
  getSlotsForBooking,
  type DragPreview,
  type MovePreview,
  type ResizePreview,
  TIME_COLUMN_HEADER_CLASS,
} from "@/components/timetable-shell.shared"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type {
  CreateBookingInput,
  UpdateBookingDetailsInput,
  UpdateBookingInput,
} from "@/hooks/use-local-bookings"
import { useSlotMetrics } from "@/hooks/use-slot-metrics"
import {
  TIME_SLOTS,
  buildDaySlotMaps,
  canPlaceBookingAt,
  getResizeSlotCount,
} from "@/lib/constants"
import type { TimeSlot } from "@/lib/constants"
import type { Booking } from "@/lib/types"
import { getBookingErrorMessage, isPastSlotBlocked } from "@/lib/slot-validation"
import {
  formatWeekRange,
  formatWeekday,
  getCurrentWeekStart,
  getWeekdayDates,
  isCurrentWeek,
  shiftWeek,
  toDateKey,
} from "@/lib/week"
import { cn } from "@/lib/utils"

const BookingDialog = dynamic(
  () =>
    import("@/components/booking-dialog").then((module) => ({
      default: module.BookingDialog,
    })),
  { ssr: false }
)

type TimetableShellProps = {
  weekStart: Date
  bookings: Booking[] | undefined
  createBooking: (input: CreateBookingInput) => Promise<void>
  updateBooking: (input: UpdateBookingInput) => Promise<void>
  updateBookingDetails: (input: UpdateBookingDetailsInput) => Promise<void>
  removeBooking: (id: string) => Promise<void>
  isLocal?: boolean
}

type SlotSelection = {
  slotDate: string
  slotTime: TimeSlot
  slotCount: number
  booking?: Booking
}

export function TimetableShell({
  weekStart,
  bookings,
  createBooking,
  updateBooking,
  updateBookingDetails,
  removeBooking,
  isLocal = false,
}: TimetableShellProps) {
  const [selection, setSelection] = useState<SlotSelection | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null)
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null)
  const [movePreview, setMovePreview] = useState<MovePreview | null>(null)
  const isDraggingRef = useRef(false)
  const isResizingRef = useRef(false)
  const isMovingRef = useRef(false)
  const moveDidChangeRef = useRef(false)
  const dragPreviewRef = useRef<DragPreview | null>(null)
  const resizePreviewRef = useRef<ResizePreview | null>(null)
  const movePreviewRef = useRef<MovePreview | null>(null)
  const daySlotMapsRef = useRef<
    Map<string, ReturnType<typeof buildDaySlotMaps<Booking>>>
  >(new Map())

  const weekDays = useMemo(() => getWeekdayDates(weekStart), [weekStart])
  const weekDateKeys = useMemo(() => weekDays.map(toDateKey), [weekDays])
  const now = useBuenosAiresNow()
  const todayKey = now.dateKey
  const currentWeekStart = getCurrentWeekStart()
  const showingCurrentWeek = isCurrentWeek(weekStart)
  const canGoPrevious = weekStart.getTime() > currentWeekStart.getTime()
  const previousWeek = useMemo(() => shiftWeek(weekStart, -1), [weekStart])
  const nextWeek = useMemo(() => shiftWeek(weekStart, 1), [weekStart])
  const weekKey = toDateKey(weekStart)
  const { tableContainerRef, tbodyRef, registerDayColumn, metrics } =
    useSlotMetrics(weekKey, bookings !== undefined)

  const hiddenBookingId = movePreview?.booking.id ?? resizePreview?.booking.id

  const displayBookings = useMemo(() => {
    const list = bookings ?? []

    if (!hiddenBookingId) {
      return list
    }

    return list.filter((booking) => booking.id !== hiddenBookingId)
  }, [bookings, hiddenBookingId])

  const daySlotMaps = useMemo(() => {
    const maps = new Map<
      string,
      ReturnType<typeof buildDaySlotMaps<Booking>>
    >()

    for (const day of weekDays) {
      const slotDate = toDateKey(day)
      maps.set(slotDate, buildDaySlotMaps<Booking>(displayBookings, slotDate))
    }

    return maps
  }, [displayBookings, weekDays])

  useEffect(() => {
    daySlotMapsRef.current = daySlotMaps
  }, [daySlotMaps])

  const syncDragPreview = useCallback((preview: DragPreview | null) => {
    dragPreviewRef.current = preview
    startTransition(() => setDragPreview(preview))
  }, [])

  const syncMovePreview = useCallback((preview: MovePreview | null) => {
    movePreviewRef.current = preview
    startTransition(() => setMovePreview(preview))
  }, [])

  const syncResizePreview = useCallback((preview: ResizePreview | null) => {
    resizePreviewRef.current = preview
    startTransition(() => setResizePreview(preview))
  }, [])

  const commitBookingUpdate = useCallback(
    async (input: UpdateBookingInput) => {
      try {
        await updateBooking(input)
      } catch (error) {
        setActionError(getBookingErrorMessage(error))
      }
    },
    [updateBooking]
  )

  useEffect(() => {
    function stopPointerInteraction() {
      if (isResizingRef.current) {
        const preview = resizePreviewRef.current
        isResizingRef.current = false
        syncResizePreview(null)

        if (preview && preview.slotCount !== preview.booking.slotCount) {
          void commitBookingUpdate({
            id: preview.booking.id,
            slotDate: preview.booking.slotDate,
            slotTime: preview.booking.slotTime,
            slotCount: preview.slotCount,
          })
        }

        return
      }

      if (isMovingRef.current) {
        const preview = movePreviewRef.current
        const didMove = moveDidChangeRef.current
        isMovingRef.current = false
        moveDidChangeRef.current = false
        syncMovePreview(null)

        if (preview && didMove) {
          void commitBookingUpdate({
            id: preview.booking.id,
            slotDate: preview.slotDate,
            slotTime: preview.slotTime,
            slotCount: preview.booking.slotCount,
          })
        } else if (preview) {
          setSelection({
            slotDate: preview.booking.slotDate,
            slotTime: preview.booking.slotTime as TimeSlot,
            slotCount: preview.booking.slotCount,
            booking: preview.booking,
          })
        }

        return
      }

      const preview = dragPreviewRef.current

      if (!isDraggingRef.current || !preview) {
        isDraggingRef.current = false
        syncDragPreview(null)
        return
      }

      const dayMaps = daySlotMapsRef.current.get(preview.slotDate)
      const { startTime, slotCount } = getOrderedSlotRange(
        preview.startTime,
        preview.endTime
      )
      const slots = getSlotsForBooking(startTime, slotCount)
      const overlaps = slots.some((slotTime) =>
        dayMaps?.occupiedSlots.has(slotTime)
      )
      const past = isPastSlotBlocked(
        preview.slotDate,
        startTime,
        getBuenosAiresNow()
      )

      isDraggingRef.current = false
      syncDragPreview(null)

      if (past) {
        setActionError("That time slot is in the past.")
        return
      }

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
  }, [commitBookingUpdate, syncDragPreview, syncMovePreview, syncResizePreview])

  const handleSlotPointerDown = useCallback(
    (slotDate: string, slotTime: TimeSlot, occupiedSlots: Set<string>) => {
      if (
        isResizingRef.current ||
        isMovingRef.current ||
        occupiedSlots.has(slotTime) ||
        isPastSlotBlocked(slotDate, slotTime, now)
      ) {
        return
      }

      isDraggingRef.current = true
      syncDragPreview({
        slotDate,
        startTime: slotTime,
        endTime: slotTime,
      })
    },
    [now, syncDragPreview]
  )

  const handleSlotPointerEnter = useCallback(
    (
      slotDate: string,
      slotTime: TimeSlot,
      dayMaps: ReturnType<typeof buildDaySlotMaps<Booking>>
    ) => {
      if (isMovingRef.current && movePreviewRef.current) {
        const booking = movePreviewRef.current.booking

        if (
          !isPastSlotBlocked(slotDate, slotTime, now, booking) &&
          canPlaceBookingAt(slotTime, booking.slotCount, dayMaps.slotToBooking)
        ) {
          moveDidChangeRef.current =
            slotDate !== booking.slotDate || slotTime !== booking.slotTime
          syncMovePreview({
            booking,
            slotDate,
            slotTime,
          })
        }

        return
      }

      if (isResizingRef.current && resizePreviewRef.current) {
        const preview = resizePreviewRef.current
        const slotCount = getResizeSlotCount(
          preview.booking,
          slotTime,
          dayMaps.slotToBooking
        )

        syncResizePreview({
          booking: preview.booking,
          slotCount,
        })
        return
      }

      const preview = dragPreviewRef.current

      if (!isDraggingRef.current || !preview || preview.slotDate !== slotDate) {
        return
      }

      const { startTime, endTime, slotCount } = getOrderedSlotRange(
        preview.startTime,
        slotTime
      )

      if (isPastSlotBlocked(slotDate, startTime, now)) {
        return
      }

      const slots = getSlotsForBooking(startTime, slotCount)
      const overlaps = slots.some((candidate) =>
        dayMaps.occupiedSlots.has(candidate)
      )

      if (overlaps) {
        return
      }

      syncDragPreview({
        slotDate,
        startTime: preview.startTime,
        endTime,
      })
    },
    [now, syncDragPreview, syncMovePreview, syncResizePreview]
  )

  const handleMovePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>, booking: Booking) => {
      event.preventDefault()
      event.stopPropagation()

      isMovingRef.current = true
      moveDidChangeRef.current = false
      syncMovePreview({
        booking,
        slotDate: booking.slotDate,
        slotTime: booking.slotTime as TimeSlot,
      })
    },
    [syncMovePreview]
  )

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, booking: Booking) => {
      event.preventDefault()
      event.stopPropagation()

      isResizingRef.current = true
      syncResizePreview({
        booking,
        slotCount: booking.slotCount,
      })
    },
    [syncResizePreview]
  )

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

        {actionError ? (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            <span>{actionError}</span>
            <button
              type="button"
              className="shrink-0 underline-offset-2 hover:underline"
              onClick={() => setActionError(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Conference room
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!showingCurrentWeek ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/" />}
              >
                This week
              </Button>
            ) : null}
            {canGoPrevious ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/?week=${toDateKey(previousWeek)}`} />}
              >
                Previous
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
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

        <div
          ref={tableContainerRef}
          className="relative overflow-x-auto rounded-xl border bg-background"
        >
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className={TIME_COLUMN_HEADER_CLASS} aria-hidden />
                {weekDays.map((day, dayIndex) => {
                  const isToday = toDateKey(day) === todayKey

                  return (
                    <th
                      key={toDateKey(day)}
                      aria-current={isToday ? "date" : undefined}
                      className={cn(
                        "px-3 py-2 text-left font-medium",
                        isToday ? "bg-foreground/[0.06]" : "bg-background",
                        dayIndex > 0 && "border-l border-border/40"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className={cn(isToday && "text-foreground")}>
                          {formatWeekday(day)}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-normal",
                            isToday
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                          )}
                        >
                          {Number(toDateKey(day).slice(8, 10))}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody ref={tbodyRef}>
              {TIME_SLOTS.map((slotTime, slotRowIndex) => (
                <TimetableRow
                  key={slotTime}
                  slotTime={slotTime}
                  slotRowIndex={slotRowIndex}
                  weekDays={weekDays}
                  todayKey={todayKey}
                  now={now}
                  daySlotMaps={daySlotMaps}
                  dragPreview={dragPreview}
                  movePreview={movePreview}
                  metrics={metrics}
                  registerDayColumn={registerDayColumn}
                  onSlotPointerDown={handleSlotPointerDown}
                  onSlotPointerEnter={handleSlotPointerEnter}
                  onMovePointerDown={handleMovePointerDown}
                  onResizePointerDown={handleResizePointerDown}
                />
              ))}
            </tbody>
          </table>

          {metrics ? (
            <TimetableNowLine metrics={metrics} weekDateKeys={weekDateKeys} />
          ) : null}

          {metrics && movePreview ? (
            <BookingBlockOverlay
              booking={movePreview.booking}
              slotDate={movePreview.slotDate}
              slotTime={movePreview.slotTime}
              slotCount={movePreview.booking.slotCount}
              metrics={metrics}
            />
          ) : null}

          {metrics && resizePreview ? (
            <BookingBlockOverlay
              booking={resizePreview.booking}
              slotDate={resizePreview.booking.slotDate}
              slotTime={resizePreview.booking.slotTime as TimeSlot}
              slotCount={resizePreview.slotCount}
              metrics={metrics}
            />
          ) : null}
        </div>
      </div>

      <BookingDialog
        selection={selection}
        onClose={() => setSelection(null)}
        createBooking={createBooking}
        updateBookingDetails={updateBookingDetails}
        removeBooking={removeBooking}
      />
    </>
  )
}
