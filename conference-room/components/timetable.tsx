"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { BookingDialog } from "@/components/booking-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

type TimetableProps = {
  weekStart: Date
  bookings: Booking[]
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

export function Timetable({ weekStart, bookings }: TimetableProps) {
  const [selection, setSelection] = useState<{
    slotDate: string
    slotTime: TimeSlot
    booking?: Booking
  } | null>(null)

  const weekDays = useMemo(() => getWeekdayDates(weekStart), [weekStart])

  const bookingMap = useMemo(() => {
    const map = new Map<string, Booking>()
    for (const booking of bookings) {
      map.set(`${booking.slotDate}_${booking.slotTime}`, booking)
    }
    return map
  }, [bookings])

  const nextWeek = shiftWeek(weekStart, 1)

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
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

      <BookingDialog selection={selection} onClose={() => setSelection(null)} />
    </>
  )
}
