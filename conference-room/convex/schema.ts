import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  bookings: defineTable({
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
    createdAt: v.number(),
    slotChangedAt: v.optional(v.number()),
  })
    .index("by_slot_date", ["slotDate"])
    .index("by_slot", ["slotDate", "slotTime"]),
})
