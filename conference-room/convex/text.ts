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
const EDIT_COALESCE_MS = 2_500
const MAX_EDIT_LOG = 40

const company = v.union(
  v.literal("nilo"),
  v.literal("first-plug"),
  v.literal("volantis")
)

const DEFAULT_CONTENT = `# Lola — Señales tempranas

Lola es una chica que se mueve con bastante autonomía: se suma a las tareas compartidas sin que nadie le pida, trabaja sola con foco y disfrute, y se anima a probar herramientas nuevas sin que la incomodidad inicial la frene. Esto ya aparece de manera confiable en distintos momentos del día —rutina, trabajo individual, interacción con pares—, así que parece un rasgo bastante propio de ella, no algo casual. Lo que vale la pena seguir mirando es si esa iniciativa también se expresa en otros terrenos (por ejemplo, cómo resuelve un desacuerdo o pide ayuda cuando algo no le sale), para confirmar que es igual de sólida ahí.

## ¿Cómo está esta niña ahora mismo?

Señal temprana.

## ¿En qué es fuerte?

Lola muestra de manera confiable su capacidad de iniciativa y autonomía: actúa por sí misma, sin necesidad de que un adulto le indique qué hacer, y esto aparece en muchas situaciones distintas — en el juego libre, en el trabajo individual, en momentos de transición y en la interacción con pares.

Un ejemplo es cuando, al terminar el almuerzo, se sumó espontáneamente a la tarea de orden:

> Al finalizar el almuerzo los niños comenzaron de manera voluntaria a ayudar con la limpieza de las mesas usando sprays y paños que tenían a disposición, así como escobas y palas para ayudar a recoger los restos de comida que cayeron al suelo.
>
> — 22 de junio, durante una transición de rutina

También se destaca con solidez en su sentido de pertenencia y en su disfrute genuino del proceso, algo que se repite en distintos contextos del día. A esto se suma una expresión creativa con identidad propia, visible cuando elabora su personaje con una técnica nueva:

> Lola realizó un tigre con la técnica propuesta (fieltro adujado) como su personaje de otra galaxia. Le puso colores celeste y rosas, aplicando su destreza manual e imaginación.
>
> — 19 de junio, durante el trabajo individual

## ¿Esto se está volviendo parte de quién es?

Señal temprana.

## ¿Es real, o lo vimos una sola vez?

Señal temprana.

## ¿Qué pasó?

Te cuento tres momentos concretos donde se la vio actuar con bastante autonomía e iniciativa, en situaciones bien distintas.

El primero, en una transición de rutina, después del almuerzo:

> Al finalizar el almuerzo los niños comenzaron de manera voluntaria a ayudar con la limpieza de las mesas usando sprays y paños que tenían a disposición, así como escobas y palas para ayudar a recoger los restos de comida que cayeron al suelo.
>
> — 22 de junio, al finalizar el almuerzo

El segundo, en trabajo individual, con una propuesta artística:

> Lola realizó un tigre con la técnica propuesta (fieltro adujado) como su personaje de otra galaxia. Le puso colores celeste y rosas, aplicando su destreza manual e imaginación. Aprendió muy rápidamente cómo funcionaba la técnica y ejecutó lo que estaba en su imaginación.
>
> — 19 de junio, durante el trabajo individual

El tercero, en interacción con compañeros, muestra cómo se anima a probar herramientas nuevas sin que la incomodidad inicial la frene:

> Empezó a usar Tinkercad muy rápido, y lo mismo pasó con la app Procreate para dibujar. No le molesta incomodarse mientras aprende a usar una herramienta.
>
> — 19 de junio, durante la interacción con compañeros

Son tres escenas distintas —una rutina compartida, un trabajo a solas y un intercambio con pares— donde Lola se muestra activa por decisión propia.
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

export const getTextContent = query({
  args: {
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const document = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    if (!document) {
      return {
        slug,
        segments: getDefaultSegments(),
        content: DEFAULT_CONTENT,
        updatedAt: 0,
        isSeeded: false,
        status: "drafting" as const,
        lockedAt: null,
        lockedByName: null,
        lockedByCompany: null,
        baselineContent: DEFAULT_CONTENT,
      }
    }

    const baselineSegments = document.baselineSegments ?? getDefaultSegments()

    return {
      slug,
      segments: document.segments,
      content: joinSegments(document.segments),
      updatedAt: document.updatedAt,
      isSeeded: true,
      status: document.status ?? ("drafting" as const),
      lockedAt: document.lockedAt ?? null,
      lockedByName: document.lockedByName ?? null,
      lockedByCompany: document.lockedByCompany ?? null,
      baselineContent: joinSegments(baselineSegments),
    }
  },
})

export const getTextMeta = query({
  args: {
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG

    // No time argument here on purpose: passing a changing `now` would
    // re-subscribe the query on every tick, briefly returning undefined and
    // unmounting the editor. The client filters stale presence by lastSeen.
    const presence = await ctx.db
      .query("textPresence")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .collect()

    const edits = (
      await ctx.db
        .query("textEdits")
        .withIndex("by_slug_created", (query) => query.eq("slug", slug))
        .order("desc")
        .take(MAX_EDIT_LOG)
    ).sort(
      (left, right) =>
        (right.updatedAt ?? right.createdAt) - (left.updatedAt ?? left.createdAt)
    )

    return {
      presence: presence.sort((left, right) =>
        left.name.localeCompare(right.name)
      ),
      edits,
    }
  },
})

/** @deprecated Use getTextContent + getTextMeta instead. */
export const getDocument = query({
  args: {
    slug: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const now = args.now
    const document = await ctx.db
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

    const edits = (
      await ctx.db
        .query("textEdits")
        .withIndex("by_slug_created", (query) => query.eq("slug", slug))
        .order("desc")
        .take(MAX_EDIT_LOG)
    ).sort(
      (left, right) =>
        (right.updatedAt ?? right.createdAt) - (left.updatedAt ?? left.createdAt)
    )

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
      status: "drafting",
      baselineSegments: getDefaultSegments(),
    })
  },
})

export const resetDocument = mutation({
  args: {
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const now = Date.now()

    const document = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    if (document) {
      await ctx.db.patch(document._id, {
        segments: getDefaultSegments(),
        updatedAt: now,
        status: "drafting",
        baselineSegments: getDefaultSegments(),
        lockedAt: undefined,
        lockedByName: undefined,
        lockedByCompany: undefined,
      })
    } else {
      await ctx.db.insert("textDocuments", {
        slug,
        segments: getDefaultSegments(),
        updatedAt: now,
        status: "drafting",
        baselineSegments: getDefaultSegments(),
      })
    }

    const edits = await ctx.db
      .query("textEdits")
      .withIndex("by_slug_created", (query) => query.eq("slug", slug))
      .collect()

    for (const edit of edits) {
      await ctx.db.delete(edit._id)
    }

    const presence = await ctx.db
      .query("textPresence")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .collect()

    for (const entry of presence) {
      await ctx.db.delete(entry._id)
    }

    return { slug, reseeded: true }
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
        status: "drafting",
        baselineSegments: getDefaultSegments(),
      })
      document = await ctx.db.get(documentId)
    }

    if (!document) {
      throw new Error("Document could not be loaded.")
    }

    if (document.status === "locked") {
      throw new Error("The report is locked. Reopen it to keep editing.")
    }

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

    return {
      content: nextText,
      updatedAt: now,
    }
  },
})

export const recordEditBurst = mutation({
  args: {
    slug: v.optional(v.string()),
    sessionId: v.string(),
    name: v.string(),
    company,
    baselineText: v.string(),
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const name = args.name.trim()

    if (!name) {
      throw new Error("Name is required.")
    }

    const document = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    if (!document) {
      return null
    }

    const currentText = joinSegments(document.segments)

    if (args.baselineText === currentText) {
      return null
    }

    const now = Date.now()
    const recentEdits = await ctx.db
      .query("textEdits")
      .withIndex("by_slug_created", (query) => query.eq("slug", slug))
      .order("desc")
      .take(8)

    const recentEdit =
      recentEdits.find((entry) => entry.sessionId === args.sessionId) ?? null

    const recentEditTimestamp =
      recentEdit?.updatedAt ?? recentEdit?.createdAt ?? 0
    const canCoalesce =
      recentEdit !== null && now - recentEditTimestamp <= EDIT_COALESCE_MS

    if (canCoalesce && recentEdit) {
      const baselineText = recentEdit.baselineText ?? args.baselineText

      await ctx.db.patch(recentEdit._id, {
        summary: summarizeEdit(baselineText, currentText),
        snapshot: document.segments,
        updatedAt: now,
      })

      return recentEdit._id
    }

    return await ctx.db.insert("textEdits", {
      slug,
      sessionId: args.sessionId,
      name,
      company: args.company,
      summary: summarizeEdit(args.baselineText, currentText),
      baselineText: args.baselineText,
      snapshot: document.segments,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const restoreToEdit = mutation({
  args: {
    slug: v.optional(v.string()),
    editId: v.id("textEdits"),
    sessionId: v.string(),
    name: v.string(),
    company,
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const name = args.name.trim()

    if (!name) {
      throw new Error("Name is required.")
    }

    const edit = await ctx.db.get(args.editId)

    if (!edit || edit.slug !== slug || !edit.snapshot) {
      throw new Error("That version can no longer be restored.")
    }

    const document = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    if (!document) {
      throw new Error("Document could not be loaded.")
    }

    if (document.status === "locked") {
      throw new Error("The report is locked. Reopen it to restore a version.")
    }

    const currentText = joinSegments(document.segments)
    const restoredText = joinSegments(edit.snapshot)

    if (currentText === restoredText) {
      return null
    }

    const now = Date.now()

    await ctx.db.patch(document._id, {
      segments: edit.snapshot,
      updatedAt: now,
    })

    // Log the restore as its own snapshot so the action is reversible too.
    return await ctx.db.insert("textEdits", {
      slug,
      sessionId: args.sessionId,
      name,
      company: args.company,
      summary: `restored the report to ${edit.name}'s version`,
      baselineText: currentText,
      snapshot: edit.snapshot,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const lockDocument = mutation({
  args: {
    slug: v.optional(v.string()),
    sessionId: v.string(),
    name: v.string(),
    company,
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const name = args.name.trim()

    if (!name) {
      throw new Error("Name is required.")
    }

    const document = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    if (!document) {
      throw new Error("Document could not be loaded.")
    }

    if (document.status === "locked") {
      return null
    }

    const now = Date.now()

    // The locked version becomes the baseline the next review diff compares to.
    await ctx.db.patch(document._id, {
      status: "locked",
      lockedAt: now,
      lockedByName: name,
      lockedByCompany: args.company,
      baselineSegments: document.segments,
      updatedAt: now,
    })

    return await ctx.db.insert("textEdits", {
      slug,
      sessionId: args.sessionId,
      name,
      company: args.company,
      summary: "locked the report as the official version",
      baselineText: joinSegments(document.segments),
      snapshot: document.segments,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const reopenDocument = mutation({
  args: {
    slug: v.optional(v.string()),
    sessionId: v.string(),
    name: v.string(),
    company,
  },
  handler: async (ctx, args) => {
    const slug = args.slug ?? DEFAULT_SLUG
    const name = args.name.trim()

    if (!name) {
      throw new Error("Name is required.")
    }

    const document = await ctx.db
      .query("textDocuments")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique()

    if (!document) {
      throw new Error("Document could not be loaded.")
    }

    if (document.status !== "locked") {
      return null
    }

    const now = Date.now()

    await ctx.db.patch(document._id, {
      status: "drafting",
      updatedAt: now,
    })

    return await ctx.db.insert("textEdits", {
      slug,
      sessionId: args.sessionId,
      name,
      company: args.company,
      summary: "reopened the report for editing",
      baselineText: joinSegments(document.segments),
      snapshot: document.segments,
      createdAt: now,
      updatedAt: now,
    })
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
