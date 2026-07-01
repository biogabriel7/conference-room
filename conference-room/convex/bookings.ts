import { v } from "convex/values"

import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import {
  classifyRecurrenceOccurrences,
  getRecurrenceDates,
} from "../lib/recurrence"

const recurrenceEnd = v.union(
  v.literal("1month"),
  v.literal("3months"),
  v.literal("6months"),
  v.literal("1year"),
  v.literal("52weeks")
)

const recurringArgs = {
  slotDate: v.string(),
  slotTime: v.string(),
  slotCount: v.number(),
  intervalWeeks: v.union(v.literal(1), v.literal(2)),
  end: recurrenceEnd,
}

type RecurringArgs = {
  slotDate: string
  slotTime: string
  slotCount: number
  intervalWeeks: 1 | 2
  end: "1month" | "3months" | "6months" | "1year" | "52weeks"
}

const SLOT_DURATION_MINUTES = 15
const DAY_START_MINUTES = 8 * 60
const DAY_END_MINUTES = 18 * 60
const LAST_SLOT_START_MINUTES = DAY_END_MINUTES - SLOT_DURATION_MINUTES

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function generateTimeSlots() {
  const slots: string[] = []

  for (
    let minutes = DAY_START_MINUTES;
    minutes <= LAST_SLOT_START_MINUTES;
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

// Argentina stays on UTC-3 all year (no DST), so we can shift UTC directly
// rather than depending on Intl time-zone data being available at runtime.
const BUENOS_AIRES_OFFSET_MS = 3 * 60 * 60 * 1000

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function getBuenosAiresNow(now: number) {
  const art = new Date(now - BUENOS_AIRES_OFFSET_MS)
  const year = art.getUTCFullYear()
  const month = String(art.getUTCMonth() + 1).padStart(2, "0")
  const day = String(art.getUTCDate()).padStart(2, "0")

  return {
    dateKey: `${year}-${month}-${day}`,
    minutes: art.getUTCHours() * 60 + art.getUTCMinutes(),
  }
}

function isPastSlotAt(slotDate: string, slotTime: string, now: number) {
  const { dateKey, minutes } = getBuenosAiresNow(now)

  if (slotDate < dateKey) {
    return true
  }

  if (slotDate > dateKey) {
    return false
  }

  return timeToMinutes(slotTime) < minutes
}

const BOOKING_GRACE_PERIOD_MS = 30_000

function isBookingInGracePeriod(
  booking: { createdAt: number; slotChangedAt?: number },
  now: number
) {
  const anchor = Math.max(
    booking.createdAt,
    booking.slotChangedAt ?? booking.createdAt
  )

  return now - anchor <= BOOKING_GRACE_PERIOD_MS
}

function assertNotPastSlot(
  slotDate: string,
  slotTime: string,
  now: number,
  booking?: { createdAt: number; slotChangedAt?: number }
) {
  if (!isPastSlotAt(slotDate, slotTime, now)) {
    return
  }

  if (booking && isBookingInGracePeriod(booking, now)) {
    return
  }

  throw new Error("That time slot is in the past.")
}

async function getBookingsInDateRange(
  ctx: QueryCtx | MutationCtx,
  startDate: string,
  endDate: string
) {
  return await ctx.db
    .query("bookings")
    .withIndex("by_slot_date", (q) =>
      q.gte("slotDate", startDate).lte("slotDate", endDate)
    )
    .collect()
}

async function getRecurringPreview(
  ctx: QueryCtx | MutationCtx,
  args: RecurringArgs,
  now: number
) {
  const slotCount = Math.max(1, args.slotCount)
  const slots = getSlotsForBooking(args.slotTime, slotCount)

  if (slots.length !== slotCount) {
    throw new Error("That booking extends beyond the available hours.")
  }

  const slotDates = getRecurrenceDates(
    args.slotDate,
    args.intervalWeeks,
    args.end
  )
  const bookings = await getBookingsInDateRange(
    ctx,
    slotDates[0],
    slotDates[slotDates.length - 1]
  )

  return classifyRecurrenceOccurrences(
    slotDates,
    args.slotTime,
    slotCount,
    bookings,
    getBuenosAiresNow(now)
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
      .map(({ _id, _creationTime, ...booking }) => {
        void _creationTime

        return {
          id: _id,
          ...booking,
          slotCount: booking.slotCount ?? 1,
          slotTime: booking.slotTime,
          createdAt: new Date(booking.createdAt).toISOString(),
          slotChangedAt: booking.slotChangedAt
            ? new Date(booking.slotChangedAt).toISOString()
            : new Date(booking.createdAt).toISOString(),
        }
      })
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

    const name = args.name.trim()
    if (!name) {
      throw new Error("Name is required.")
    }

    const now = Date.now()

    assertNotPastSlot(args.slotDate, args.slotTime, now)

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
      name,
      company: args.company,
      note: args.note.trim(),
      createdAt: now,
      slotChangedAt: now,
    })
  },
})

export const previewRecurring = query({
  args: recurringArgs,
  handler: async (ctx, args) => {
    return await getRecurringPreview(ctx, args, Date.now())
  },
})

export const createRecurring = mutation({
  args: {
    ...recurringArgs,
    name: v.string(),
    company: v.union(
      v.literal("nilo"),
      v.literal("first-plug"),
      v.literal("volantis")
    ),
    note: v.string(),
    skipConflicts: v.boolean(),
  },
  handler: async (ctx, args) => {
    const slotCount = Math.max(1, args.slotCount)
    const name = args.name.trim()

    if (!name) {
      throw new Error("Name is required.")
    }

    const now = Date.now()
    const preview = await getRecurringPreview(ctx, args, now)
    const unavailable = preview.occurrences.filter(
      (occurrence) => occurrence.status !== "available"
    )

    if (!args.skipConflicts && unavailable.length > 0) {
      throw new Error("Some dates conflict.")
    }

    const available = preview.occurrences.filter(
      (occurrence) => occurrence.status === "available"
    )

    if (available.length === 0) {
      throw new Error("No dates are available for that recurring booking.")
    }

    const seriesId = crypto.randomUUID()
    const note = args.note.trim()

    for (const occurrence of available) {
      await ctx.db.insert("bookings", {
        slotDate: occurrence.slotDate,
        slotTime: args.slotTime,
        slotCount,
        name,
        company: args.company,
        note,
        createdAt: now,
        slotChangedAt: now,
        seriesId,
      })
    }

    return {
      seriesId,
      created: available.length,
      skipped: unavailable.length,
    }
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

    const now = Date.now()

    assertNotPastSlot(args.slotDate, args.slotTime, now, booking)

    const dayBookings = await ctx.db
      .query("bookings")
      .withIndex("by_slot_date", (q) => q.eq("slotDate", args.slotDate))
      .collect()

    for (const slotTime of slots) {
      const conflict = dayBookings.find(
        (candidate) =>
          candidate._id !== booking._id &&
          bookingOccupiesSlot(candidate, slotTime)
      )

      if (conflict) {
        throw new Error("That slot is already booked.")
      }
    }

    await ctx.db.patch(args.id, {
      slotDate: args.slotDate,
      slotTime: args.slotTime,
      slotCount,
      slotChangedAt: now,
    })
  },
})

export const updateDetails = mutation({
  args: {
    id: v.id("bookings"),
    name: v.string(),
    company: v.union(
      v.literal("nilo"),
      v.literal("first-plug"),
      v.literal("volantis")
    ),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id)

    if (!booking) {
      throw new Error("Booking not found.")
    }

    const name = args.name.trim()
    if (!name) {
      throw new Error("Name is required.")
    }

    await ctx.db.patch(args.id, {
      name,
      company: args.company,
      note: args.note.trim(),
    })
  },
})

export const countBySeries = query({
  args: {
    seriesId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("bookings")
      .withIndex("by_series", (query) => query.eq("seriesId", args.seriesId))
      .collect()

    return rows.length
  },
})

export const remove = mutation({
  args: {
    id: v.id("bookings"),
    scope: v.optional(v.union(v.literal("single"), v.literal("series"))),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id)

    if (!booking) {
      throw new Error("Booking not found.")
    }

    const scope = args.scope ?? "single"

    if (scope === "series" && booking.seriesId) {
      const siblings = await ctx.db
        .query("bookings")
        .withIndex("by_series", (query) =>
          query.eq("seriesId", booking.seriesId)
        )
        .collect()

      for (const sibling of siblings) {
        await ctx.db.delete(sibling._id)
      }

      return { deleted: siblings.length }
    }

    await ctx.db.delete(args.id)

    return { deleted: 1 }
  },
})

// First day (Monday) of the week that should be kept, in Buenos Aires time.
// Everything dated before this is "last week or older" and gets purged.
function upcomingMondayKey(now: number) {
  const art = new Date(now - BUENOS_AIRES_OFFSET_MS)
  const isoWeekday = art.getUTCDay() === 0 ? 7 : art.getUTCDay() // Mon=1..Sun=7
  const daysUntilMonday = (8 - isoWeekday) % 7 || 7

  const monday = new Date(
    Date.UTC(
      art.getUTCFullYear(),
      art.getUTCMonth(),
      art.getUTCDate() + daysUntilMonday
    )
  )

  const year = monday.getUTCFullYear()
  const month = String(monday.getUTCMonth() + 1).padStart(2, "0")
  const day = String(monday.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Scheduled weekly (see crons.ts) for Saturday 11pm Buenos Aires. Deletes every
// booking dated before next Monday — i.e. the week that just ended and anything
// older — while leaving future weeks' bookings untouched.
export const purgePastWeeks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = upcomingMondayKey(Date.now())

    const stale = await ctx.db
      .query("bookings")
      .withIndex("by_slot_date", (q) => q.lt("slotDate", cutoff))
      .collect()

    for (const booking of stale) {
      await ctx.db.delete(booking._id)
    }

    return { cutoff, deleted: stale.length }
  },
})
