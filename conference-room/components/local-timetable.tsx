"use client"

import { TimetableShell } from "@/components/timetable-shell"
import { useLocalBookings } from "@/hooks/use-local-bookings"
import { getWeekdayDates, toDateKey } from "@/lib/week"

type LocalTimetableProps = {
  weekStart: Date
}

export function LocalTimetable({ weekStart }: LocalTimetableProps) {
  const weekDays = getWeekdayDates(weekStart)
  const startDate = toDateKey(weekDays[0])
  const endDate = toDateKey(weekDays[4])

  const { bookings, createBooking, removeBooking } = useLocalBookings(
    startDate,
    endDate
  )

  return (
    <TimetableShell
      weekStart={weekStart}
      bookings={bookings}
      createBooking={createBooking}
      removeBooking={removeBooking}
      isLocal
    />
  )
}
