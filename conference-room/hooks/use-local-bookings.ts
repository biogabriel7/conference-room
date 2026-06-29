"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import type { CompanyId, TimeSlot } from "@/lib/constants"
import { getSlotsForBooking } from "@/lib/constants"
import type { Booking } from "@/lib/types"

const STORAGE_KEY = "conference-room-local-bookings"

export type CreateBookingInput = {
  slotDate: string
  slotTime: TimeSlot
  slotCount: number
  name: string
  company: CompanyId
  note: string
}

function sortBookings(bookings: Booking[]) {
  return [...bookings].sort((a, b) =>
    a.slotDate === b.slotDate
      ? a.slotTime.localeCompare(b.slotTime)
      : a.slotDate.localeCompare(b.slotDate)
  )
}

function readBookings(): Booking[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? (JSON.parse(stored) as Booking[]) : []
    return parsed.map((booking) => ({
      ...booking,
      slotCount: booking.slotCount ?? 1,
    }))
  } catch {
    return []
  }
}

function bookingOccupiesSlot(booking: Booking, slotDate: string, slotTime: string) {
  if (booking.slotDate !== slotDate) {
    return false
  }

  return getSlotsForBooking(booking.slotTime, booking.slotCount).includes(slotTime)
}

let bookingsStore: Booking[] = []
const listeners = new Set<() => void>()

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return bookingsStore
}

const SERVER_SNAPSHOT: Booking[] = []

function getServerSnapshot() {
  return SERVER_SNAPSHOT
}

function writeBookings(next: Booking[]) {
  bookingsStore = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emitChange()
}

if (typeof window !== "undefined") {
  bookingsStore = readBookings()
}

export function useLocalBookings(startDate: string, endDate: string) {
  const allBookings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const bookings = useMemo(
    () =>
      sortBookings(
        allBookings.filter(
          (booking) => booking.slotDate >= startDate && booking.slotDate <= endDate
        )
      ),
    [allBookings, startDate, endDate]
  )

  const createBooking = useCallback(async (input: CreateBookingInput) => {
    const slotCount = Math.max(1, input.slotCount)
    const slots = getSlotsForBooking(input.slotTime, slotCount)

    if (slots.length !== slotCount) {
      throw new Error("That booking extends beyond the available hours.")
    }

    const hasConflict = bookingsStore.some((booking) =>
      slots.some((slotTime) => bookingOccupiesSlot(booking, input.slotDate, slotTime))
    )

    if (hasConflict) {
      throw new Error("That slot is already booked.")
    }

    writeBookings([
      ...bookingsStore,
      {
        id: crypto.randomUUID(),
        ...input,
        slotCount,
        createdAt: new Date().toISOString(),
      },
    ])
  }, [])

  const removeBooking = useCallback(async (id: string) => {
    writeBookings(bookingsStore.filter((booking) => booking.id !== id))
  }, [])

  return {
    bookings,
    createBooking,
    removeBooking,
  }
}
