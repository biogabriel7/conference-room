"use client"

import { useCallback, useMemo } from "react"
import { useConvex, useMutation, useQuery } from "convex/react"

import { TimetableShell } from "@/components/timetable-shell"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type {
  CreateBookingInput,
  CreateRecurringInput,
  PreviewRecurringInput,
  UpdateBookingDetailsInput,
  UpdateBookingInput,
} from "@/hooks/use-local-bookings"
import { getWeekdayDates, toDateKey } from "@/lib/week"
import type { Booking } from "@/lib/types"

type ConvexTimetableProps = {
  weekStart: Date
}

export function ConvexTimetable({ weekStart }: ConvexTimetableProps) {
  const weekDays = useMemo(() => getWeekdayDates(weekStart), [weekStart])
  const startDate = toDateKey(weekDays[0])
  const endDate = toDateKey(weekDays[4])

  const bookings = useQuery(api.bookings.listForWeek, { startDate, endDate })
  const convex = useConvex()
  const createBookingMutation = useMutation(api.bookings.create)
  const createRecurringMutation = useMutation(api.bookings.createRecurring)
  const updateBookingMutation = useMutation(api.bookings.update)
  const updateDetailsMutation = useMutation(api.bookings.updateDetails)
  const removeBookingMutation = useMutation(api.bookings.remove)

  const createBooking = useCallback(
    async (input: CreateBookingInput) => {
      await createBookingMutation(input)
    },
    [createBookingMutation]
  )

  const previewRecurring = useCallback(
    async (input: PreviewRecurringInput) => {
      return await convex.query(api.bookings.previewRecurring, input)
    },
    [convex]
  )

  const createRecurring = useCallback(
    async (input: CreateRecurringInput) => {
      return await createRecurringMutation(input)
    },
    [createRecurringMutation]
  )

  const updateBooking = useCallback(
    async (input: UpdateBookingInput) => {
      await updateBookingMutation({
        id: input.id as Id<"bookings">,
        slotDate: input.slotDate,
        slotTime: input.slotTime,
        slotCount: input.slotCount,
      })
    },
    [updateBookingMutation]
  )

  const updateBookingDetails = useCallback(
    async (input: UpdateBookingDetailsInput) => {
      await updateDetailsMutation({
        id: input.id as Id<"bookings">,
        name: input.name,
        company: input.company,
        note: input.note,
      })
    },
    [updateDetailsMutation]
  )

  const removeBooking = useCallback(
    async (id: string) => {
      await removeBookingMutation({ id: id as Id<"bookings"> })
    },
    [removeBookingMutation]
  )

  return (
    <TimetableShell
      weekStart={weekStart}
      bookings={bookings as Booking[] | undefined}
      createBooking={createBooking}
      previewRecurring={previewRecurring}
      createRecurring={createRecurring}
      updateBooking={updateBooking}
      updateBookingDetails={updateBookingDetails}
      removeBooking={removeBooking}
    />
  )
}
