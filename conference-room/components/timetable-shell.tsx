"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { BookingDialog } from "@/components/booking-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { CreateBookingInput } from "@/hooks/use-local-bookings"
import { COMPANIES, TIME_SLOTS, formatTimeSlot, getCompanyLabel } from "@/lib/constants"
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

function companyBadgeVariant(company: string) {
  if (company === "nilo") {
    return "default" as const
  }
  if (company === "first-plug") {
    return "secondary" as const
  }
  return "outline" as const
}

export function TimetableShell({
  weekStart,
  bookings,
  createBooking,
  removeBooking,
  isLocal = false,
}: TimetableShellProps) {
  const [selection, setSelection] = useState<{
    slotDate: string
    slotTime: TimeSlot
    booking?: Booking
  } | null>(null)

  const weekDays = useMemo(() => getWeekdayDates(weekStart), [weekStart])
  const previousWeek = shiftWeek(weekStart, -1)
  const nextWeek = shiftWeek(weekStart, 1)

  const bookingMap = useMemo(() => {
    const map = new Map<string, Booking>()
    for (const booking of bookings ?? []) {
      map.set(`${booking.slotDate}_${booking.slotTime}`, booking)
    }
    return map
  }, [bookings])

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
            <Button variant="outline" size="sm" render={<Link href={`/?week=${toDateKey(previousWeek)}`} />}>
              Previous
            </Button>
            <span className="min-w-36 text-center text-sm text-muted-foreground">
              {formatWeekRange(weekStart)}
            </span>
            <Button variant="outline" size="sm" render={<Link href={`/?week=${toDateKey(nextWeek)}`} />}>
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
                  <td className="px-3 py-2 align-top text-muted-foreground">
                    {formatTimeSlot(slotTime)}
                  </td>
                  {weekDays.map((day) => {
                    const slotDate = toDateKey(day)
                    const booking = bookingMap.get(`${slotDate}_${slotTime}`)

                    return (
                      <td key={`${slotDate}_${slotTime}`} className="p-1 align-top">
                        <button
                          type="button"
                          onClick={() =>
                            setSelection({
                              slotDate,
                              slotTime,
                              booking,
                            })
                          }
                          className={cn(
                            "flex min-h-14 w-full flex-col gap-1 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:bg-muted/50",
                            booking && "border-border bg-muted/20"
                          )}
                        >
                          {booking ? (
                            <>
                              <span className="truncate font-medium">{booking.name}</span>
                              <Badge
                                variant={companyBadgeVariant(booking.company)}
                                className="w-fit"
                              >
                                {getCompanyLabel(booking.company)}
                              </Badge>
                              {booking.note ? (
                                <span className="truncate text-xs text-muted-foreground">
                                  {booking.note}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">Available</span>
                          )}
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
