"use client"

import { useEffect, useState } from "react"

export const BUENOS_AIRES_TIME_ZONE = "America/Argentina/Buenos_Aires"

const PARTS_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUENOS_AIRES_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const LABEL_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: BUENOS_AIRES_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
})

export type BuenosAiresNow = {
  /** Minutes since midnight in Buenos Aires. */
  minutes: number
  /** Calendar date in Buenos Aires as `YYYY-MM-DD`. */
  dateKey: string
  /** Human time label, e.g. "8:46 PM". */
  label: string
}

export function getBuenosAiresNow(date: Date = new Date()): BuenosAiresNow {
  const parts = PARTS_FORMAT.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00"

  // en-CA reports midnight as hour "24"; normalize to 0.
  const hour = Number(read("hour")) % 24
  const minutes = hour * 60 + Number(read("minute"))
  const dateKey = `${read("year")}-${read("month")}-${read("day")}`

  return { minutes, dateKey, label: LABEL_FORMAT.format(date) }
}

/** Tracks the current Buenos Aires time, refreshing every minute. */
export function useBuenosAiresNow(): BuenosAiresNow {
  const [now, setNow] = useState(() => getBuenosAiresNow())

  useEffect(() => {
    const id = setInterval(() => setNow(getBuenosAiresNow()), 60_000)
    return () => clearInterval(id)
  }, [])

  return now
}
