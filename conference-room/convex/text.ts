import { v } from "convex/values"

import { mutation, query } from "./_generated/server"
import {
  applyEditToSegments,
  joinSegments,
  summarizeEdit,
  type TextSegment,
} from "./segmentUtils"

const DEFAULT_SLUG = "main"
const PRESENCE_TTL_MS = 30_000
const MAX_EDIT_LOG = 40

const company = v.union(
  v.literal("nilo"),
  v.literal("first-plug"),
  v.literal("volantis")
)

const DEFAULT_CONTENT = `# Shared notes

Welcome to the collaborative text page. Everyone can edit this document in real time.

## How it works

- Type in the editor below — changes sync instantly through Convex.
- The **authorship view** shows who wrote each passage.
- The activity feed on the right lists recent edits by person.

## MDX-friendly

You can use headings, lists, and \`inline code\` here. Treat it like a plain MDX file.

- [ ] Add your first note
- [ ] Tag a teammate in the activity feed
`

function getDefaultSegments(): TextSegment[] {
  return [
    {
      sessionId: "system",
      name: "System",
      company: "nilo",
      text: DEFAULT_CONTENT,
    },
  ]
}

export const getDocument = query({
  args: {
    slug: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const now = args.now
    let document = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    if (!document) {
      return {
        slug,
        segments: getDefaultSegments(),
        content: DEFAULT_CONTENT,
        updatedAt: now,
        presence: [],
        edits: [],
        isSeeded: false,
      }
    }

    const presence = await ctx.db
      .query("textPresence")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .collect()

    const edits = await ctx.db
      .query("textEdits")
      .withIndex("by_slug_created", (query) => query.eq("slug", slug))
      .order("desc")
      .take(MAX_EDIT_LOG)

    return {
      slug,
      segments: document.segments,
      content: joinSegments(document.segments),
      updatedAt: document.updatedAt,
      presence: presence
        .filter((entry) => now - entry.lastSeen <= PRESENCE_TTL_MS)
        .sort((left, right) => left.name.localeCompare(right.name)),
      edits,
      isSeeded: true,
    }
  },
})

export const ensureDocument = mutation({
  args: {
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const existing = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    if (existing) {
      return existing._id
    }

    const now = Date.now()

    return await ctx.db.insert("textDocuments", {
      slug,
      segments: getDefaultSegments(),
      updatedAt: now,
    })
  },
})

export const applyEdit = mutation({
  args: {
    slug: v.optional(v.string()),
    sessionId: v.string(),
    name: v.string(),
    company,
    start: v.number(),
    end: v.number(),
    insertText: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const name = args.name.trim()

    if (!name) {
      throw new Error("Name is required.")
    }

    let document = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    const now = Date.now()

    if (!document) {
      const documentId = await ctx.db.insert("textDocuments", {
        slug,
        segments: getDefaultSegments(),
        updatedAt: now,
      })
      document = await ctx.db.get(documentId)
    }

    if (!document) {
      throw new Error("Document could not be loaded.")
    }

    const previousText = joinSegments(document.segments)
    const nextSegments = applyEditToSegments(
      document.segments,
      args.start,
      args.end,
      args.insertText,
      {
        sessionId: args.sessionId,
        name,
        company: args.company,
      }
    )
    const nextText = joinSegments(nextSegments)

    await ctx.db.patch(document._id, {
      segments: nextSegments,
      updatedAt: now,
    })

    await ctx.db.insert("textEdits", {
      slug,
      sessionId: args.sessionId,
      name,
      company: args.company,
      summary: summarizeEdit(previousText, nextText),
      createdAt: now,
    })

    return {
      content: nextText,
      updatedAt: now,
    }
  },
})

export const updatePresence = mutation({
  args: {
    slug: v.optional(v.string()),
    sessionId: v.string(),
    name: v.string(),
    company,
    cursor: v.number(),
    selectionStart: v.number(),
    selectionEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const name = args.name.trim()

    if (!name) {
      return null
    }

    const now = Date.now()
    const existing = await ctx.db
      .query("textPresence")
      .withIndex("by_slug_session", (query) =>
        query.eq("slug", slug).eq("sessionId", args.sessionId)
      )
      .unique()

    const payload = {
      slug,
      sessionId: args.sessionId,
      name,
      company: args.company,
      cursor: args.cursor,
      selectionStart: args.selectionStart,
      selectionEnd: args.selectionEnd,
      lastSeen: now,
    }

    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return existing._id
    }

    return await ctx.db.insert("textPresence", payload)
  },
})

export const leavePresence = mutation({
  args: {
    slug: v.optional(v.string()),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const existing = await ctx.db
      .query("textPresence")
      .withIndex("by_slug_session", (query) =>
        query.eq("slug", slug).eq("sessionId", args.sessionId)
      )
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
    }
  },
})
