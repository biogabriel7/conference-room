"use client"

import { useMutation, useQuery } from "convex/react"

import { TimetableShell } from "@/components/timetable-shell"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { getWeekdayDates, toDateKey } from "@/lib/week"
import type { Booking } from "@/lib/types"

type ConvexTimetableProps = {
  weekStart: Date
}

export function ConvexTimetable({ weekStart }: ConvexTimetableProps) {
  const weekDays = getWeekdayDates(weekStart)
  const startDate = toDateKey(weekDays[0])
  const endDate = toDateKey(weekDays[4])

  const bookings = useQuery(api.bookings.listForWeek, { startDate, endDate })
  const createBookingMutation = useMutation(api.bookings.create)
  const removeBookingMutation = useMutation(api.bookings.remove)

  return (
    <TimetableShell
      weekStart={weekStart}
      bookings={bookings as Booking[] | undefined}
      createBooking={async (input) => {
        await createBookingMutation(input)
      }}
      removeBooking={async (id) => {
        await removeBookingMutation({ id: id as Id<"bookings"> })
      }}
    />
  )
}
