import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

const company = v.union(
  v.literal("nilo"),
  v.literal("first-plug"),
  v.literal("volantis")
)

const textSegment = v.object({
  sessionId: v.string(),
  name: v.string(),
  company,
  text: v.string(),
})

export default defineSchema({
  textDocuments: defineTable({
    slug: v.string(),
    segments: v.array(textSegment),
    updatedAt: v.number(),
    status: v.optional(v.union(v.literal("drafting"), v.literal("locked"))),
    lockedAt: v.optional(v.number()),
    lockedByName: v.optional(v.string()),
    lockedByCompany: v.optional(company),
    baselineSegments: v.optional(v.array(textSegment)),
  }).index("by_slug", ["slug"]),
  textPresence: defineTable({
    slug: v.string(),
    sessionId: v.string(),
    name: v.string(),
    company,
    cursor: v.number(),
    selectionStart: v.number(),
    selectionEnd: v.number(),
    lastSeen: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_slug_session", ["slug", "sessionId"]),
  textEdits: defineTable({
    slug: v.string(),
    sessionId: v.string(),
    name: v.string(),
    company,
    summary: v.string(),
    baselineText: v.optional(v.string()),
    snapshot: v.optional(v.array(textSegment)),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_slug_created", ["slug", "createdAt"])
    .index("by_slug_session", ["slug", "sessionId"]),
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
    seriesId: v.optional(v.string()),
  })
    .index("by_slot_date", ["slotDate"])
    .index("by_slot", ["slotDate", "slotTime"])
    .index("by_series", ["seriesId"]),
})
