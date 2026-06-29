import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

const SLOT_DURATION_MINUTES = 15
const DAY_START_MINUTES = 8 * 60
const DAY_END_MINUTES = 17 * 60

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function generateTimeSlots() {
  const slots: string[] = []

  for (
    let minutes = DAY_START_MINUTES;
    minutes <= DAY_END_MINUTES;
    minutes += SLOT_DURATION_MINUTES
  ) {
    slots.push(minutesToTime(minutes))
  }

  return slots
}

const TIME_SLOTS = generateTimeSlots()

function getSlotsForBooking(startTime: string, slotCount: number) {
  const startIndex = TIME_SLOTS.indexOf(startTime)

  if (startIndex === -1 || slotCount < 1) {
    return [startTime]
  }

  return TIME_SLOTS.slice(startIndex, startIndex + slotCount)
}

function bookingOccupiesSlot(
  booking: { slotTime: string; slotCount?: number },
  slotTime: string
) {
  return getSlotsForBooking(booking.slotTime, booking.slotCount ?? 1).includes(
    slotTime
  )
}

export const listForWeek = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_slot_date", (q) =>
        q.gte("slotDate", args.startDate).lte("slotDate", args.endDate)
      )
      .collect()

    return rows
      .map(({ _id, _creationTime, ...booking }) => ({
        id: _id,
        ...booking,
        slotCount: booking.slotCount ?? 1,
        slotTime: booking.slotTime,
        createdAt: new Date(booking.createdAt).toISOString(),
      }))
      .sort((a, b) =>
        a.slotDate === b.slotDate
          ? a.slotTime.localeCompare(b.slotTime)
          : a.slotDate.localeCompare(b.slotDate)
      )
  },
})

export const create = mutation({
  args: {
    slotDate: v.string(),
    slotTime: v.string(),
    slotCount: v.number(),
    name: v.string(),
    company: v.union(
      v.literal("nilo"),
      v.literal("first-plug"),
      v.literal("volantis")
    ),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const slotCount = Math.max(1, args.slotCount)
    const slots = getSlotsForBooking(args.slotTime, slotCount)

    if (slots.length !== slotCount) {
      throw new Error("That booking extends beyond the available hours.")
    }

    const dayBookings = await ctx.db
      .query("bookings")
      .withIndex("by_slot_date", (q) => q.eq("slotDate", args.slotDate))
      .collect()

    for (const slotTime of slots) {
      const conflict = dayBookings.find((booking) =>
        bookingOccupiesSlot(booking, slotTime)
      )

      if (conflict) {
        throw new Error("That slot is already booked.")
      }
    }

    await ctx.db.insert("bookings", {
      slotDate: args.slotDate,
      slotTime: args.slotTime,
      slotCount,
      name: args.name,
      company: args.company,
      note: args.note,
      createdAt: Date.now(),
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("bookings"),
    slotDate: v.string(),
    slotTime: v.string(),
    slotCount: v.number(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id)

    if (!booking) {
      throw new Error("Booking not found.")
    }

    const slotCount = Math.max(1, args.slotCount)
    const slots = getSlotsForBooking(args.slotTime, slotCount)

    if (slots.length !== slotCount) {
      throw new Error("That booking extends beyond the available hours.")
    }

    const dayBookings = await ctx.db
      .query("bookings")
      .withIndex("by_slot_date", (q) => q.eq("slotDate", args.slotDate))
      .collect()

    for (const slotTime of slots) {
      const conflict = dayBookings.find(
        (candidate) =>
          candidate._id !== booking._id && bookingOccupiesSlot(candidate, slotTime)
      )

      if (conflict) {
        throw new Error("That slot is already booked.")
      }
    }

    await ctx.db.patch(args.id, {
      slotDate: args.slotDate,
      slotTime: args.slotTime,
      slotCount,
    })
  },
})

export const remove = mutation({
  args: {
    id: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id)
  },
})
