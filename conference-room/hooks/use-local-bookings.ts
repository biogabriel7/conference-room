"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

import type { CompanyId, TimeSlot } from "@/lib/constants"
import { getSlotsForBooking } from "@/lib/constants"
import {
  assertNotPastSlotForBookingMove,
  assertNotPastSlotForCreate,
} from "@/lib/slot-validation"
import type { Booking } from "@/lib/types"

const STORAGE_KEY = "conference-room-local-bookings"
const STORAGE_VERSION = 1

type StoredBookings = {
  v: number
  bookings: Booking[]
}

export type UpdateBookingInput = {
  id: string
  slotDate: string
  slotTime: TimeSlot
  slotCount: number
}

export type UpdateBookingDetailsInput = {
  id: string
  name: string
  company: CompanyId
  note: string
}

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
    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored) as StoredBookings | Booking[]

    if (Array.isArray(parsed)) {
    return parsed.map((booking) => normalizeBooking(booking))
    }

    if (parsed.v !== STORAGE_VERSION || !Array.isArray(parsed.bookings)) {
      return []
    }

    return parsed.bookings.map((booking) => normalizeBooking(booking))
  } catch {
    return []
  }
}

function normalizeBooking(booking: Booking): Booking {
  return {
    ...booking,
    slotCount: booking.slotCount ?? 1,
    slotChangedAt: booking.slotChangedAt ?? booking.createdAt,
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
  const payload: StoredBookings = { v: STORAGE_VERSION, bookings: next }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
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

    const name = input.name.trim()
    if (!name) {
      throw new Error("Name is required.")
    }

    assertNotPastSlotForCreate(input.slotDate, input.slotTime)

    const hasConflict = bookingsStore.some((booking) =>
      slots.some((slotTime) => bookingOccupiesSlot(booking, input.slotDate, slotTime))
    )

    if (hasConflict) {
      throw new Error("That slot is already booked.")
    }

    const createdAt = new Date().toISOString()

    writeBookings([
      ...bookingsStore,
      {
        id: crypto.randomUUID(),
        ...input,
        name,
        note: input.note.trim(),
        slotCount,
        createdAt,
        slotChangedAt: createdAt,
      },
    ])
  }, [])

  const removeBooking = useCallback(async (id: string) => {
    writeBookings(bookingsStore.filter((booking) => booking.id !== id))
  }, [])

  const updateBooking = useCallback(async (input: UpdateBookingInput) => {
    const booking = bookingsStore.find((candidate) => candidate.id === input.id)

    if (!booking) {
      throw new Error("Booking not found.")
    }

    const slotCount = Math.max(1, input.slotCount)
    const slots = getSlotsForBooking(input.slotTime, slotCount)

    if (slots.length !== slotCount) {
      throw new Error("That booking extends beyond the available hours.")
    }

    assertNotPastSlotForBookingMove(input.slotDate, input.slotTime, booking)

    const hasConflict = bookingsStore.some(
      (candidate) =>
        candidate.id !== booking.id &&
        slots.some((slotTime) =>
          bookingOccupiesSlot(candidate, input.slotDate, slotTime)
        )
    )

    if (hasConflict) {
      throw new Error("That slot is already booked.")
    }

    const slotChangedAt = new Date().toISOString()

    writeBookings(
      bookingsStore.map((candidate) =>
        candidate.id === booking.id
          ? {
              ...candidate,
              slotDate: input.slotDate,
              slotTime: input.slotTime,
              slotCount,
              slotChangedAt,
            }
          : candidate
      )
    )
  }, [])

  const updateBookingDetails = useCallback(async (input: UpdateBookingDetailsInput) => {
    const booking = bookingsStore.find((candidate) => candidate.id === input.id)

    if (!booking) {
      throw new Error("Booking not found.")
    }

    const name = input.name.trim()
    if (!name) {
      throw new Error("Name is required.")
    }

    writeBookings(
      bookingsStore.map((candidate) =>
        candidate.id === booking.id
          ? {
              ...candidate,
              name,
              company: input.company,
              note: input.note.trim(),
            }
          : candidate
      )
    )
  }, [])

  return {
    bookings,
    createBooking,
    removeBooking,
    updateBooking,
    updateBookingDetails,
  }
}
