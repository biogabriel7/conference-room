import { v } from "convex/values"

import { mutation, query } from "./_generated/server"

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
    name: v.string(),
    company: v.union(
      v.literal("nilo"),
      v.literal("first-plug"),
      v.literal("volantis")
    ),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("bookings")
      .withIndex("by_slot", (q) =>
        q.eq("slotDate", args.slotDate).eq("slotTime", args.slotTime)
      )
      .unique()

    if (existing) {
      throw new Error("That slot is already booked.")
    }

    await ctx.db.insert("bookings", {
      ...args,
      createdAt: Date.now(),
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
