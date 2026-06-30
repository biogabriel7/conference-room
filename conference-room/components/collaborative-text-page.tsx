"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"

import { AppNav } from "@/components/app-nav"
import { AttributedTextView } from "@/components/attributed-text-view"
import { TextIdentityDialog } from "@/components/text-identity-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import { getCompanyLabel } from "@/lib/constants"
import type { CompanyId } from "@/lib/constants"
import { isConvexEnabled } from "@/lib/convex-config"
import {
  getAuthorLabelClassName,
  getAuthorTint,
  type AttributedSegment,
} from "@/lib/text-authorship"
import {
  computeTextDiff,
  getStoredTextIdentity,
  getTextSessionId,
  type TextIdentity,
} from "@/lib/text-session"
import { cn } from "@/lib/utils"

const PRESENCE_INTERVAL_MS = 4_000
const PRESENCE_QUERY_TICK_MS = 10_000

function formatRelativeTime(timestamp: number, now: number) {
  const deltaSeconds = Math.max(0, Math.floor((now - timestamp) / 1000))

  if (deltaSeconds < 5) {
    return "just now"
  }

  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`
  }

  const minutes = Math.floor(deltaSeconds / 60)
  return `${minutes}m ago`
}

function getLineNumber(content: string, offset: number) {
  return content.slice(0, offset).split("\n").length
}

export function CollaborativeTextPage() {
  const [now, setNow] = useState(() => Date.now())
  const [identity, setIdentity] = useState<TextIdentity | null>(null)
  const [draftText, setDraftText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [showAuthorship, setShowAuthorship] = useState(true)

  const baselineTextRef = useRef("")
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isFocusedRef = useRef(false)
  const lastInteractionRef = useRef(0)
  const pendingMutationRef = useRef(false)

  const document = useQuery(
    api.text.getDocument,
    isConvexEnabled ? { now } : "skip"
  )
  const ensureDocument = useMutation(api.text.ensureDocument)
  const applyEdit = useMutation(api.text.applyEdit)
  const updatePresence = useMutation(api.text.updatePresence)
  const leavePresence = useMutation(api.text.leavePresence)

  useEffect(() => {
    const stored = getStoredTextIdentity()

    if (stored) {
      setIdentity({
        sessionId: getTextSessionId(),
        ...stored,
      })
    }
  }, [])

  useEffect(() => {
    if (!isConvexEnabled) {
      return
    }

    void ensureDocument({})
  }, [ensureDocument])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now())
    }, PRESENCE_QUERY_TICK_MS)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!document || pendingMutationRef.current) {
      return
    }

    const remoteContent = document.content
    const recentlyEdited =
      Date.now() - lastInteractionRef.current < 1_500 && isFocusedRef.current

    if (remoteContent === baselineTextRef.current) {
      return
    }

    if (recentlyEdited && remoteContent !== draftText) {
      return
    }

    baselineTextRef.current = remoteContent
    setDraftText(remoteContent)
  }, [document, draftText])

  const pushPresence = useCallback(async () => {
    if (!identity || !isConvexEnabled) {
      return
    }

    const textarea = textareaRef.current
    const cursor = textarea?.selectionStart ?? draftText.length
    const selectionStart = textarea?.selectionStart ?? cursor
    const selectionEnd = textarea?.selectionEnd ?? cursor

    try {
      await updatePresence({
        sessionId: identity.sessionId,
        name: identity.name,
        company: identity.company,
        cursor,
        selectionStart,
        selectionEnd,
      })
    } catch {
      // Presence is best-effort.
    }
  }, [draftText.length, identity, updatePresence])

  useEffect(() => {
    if (!identity || !isConvexEnabled) {
      return
    }

    void pushPresence()
    const interval = window.setInterval(() => {
      void pushPresence()
    }, PRESENCE_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
      void leavePresence({ sessionId: identity.sessionId })
    }
  }, [identity, leavePresence, pushPresence])

  const handleChange = useCallback(
    async (nextText: string) => {
      if (!identity) {
        return
      }

      const previousText = baselineTextRef.current
      const diff = computeTextDiff(previousText, nextText)

      setDraftText(nextText)
      lastInteractionRef.current = Date.now()

      if (!diff) {
        return
      }

      baselineTextRef.current = nextText
      pendingMutationRef.current = true

      try {
        await applyEdit({
          sessionId: identity.sessionId,
          name: identity.name,
          company: identity.company,
          start: diff.start,
          end: diff.end,
          insertText: diff.insertText,
        })
        setError(null)
      } catch (mutationError) {
        baselineTextRef.current = previousText
        setDraftText(previousText)
        setError(
          mutationError instanceof Error
            ? mutationError.message
            : "Could not save your edit."
        )
      } finally {
        pendingMutationRef.current = false
      }
    },
    [applyEdit, identity]
  )

  const segments = useMemo<AttributedSegment[]>(
    () => document?.segments ?? [],
    [document?.segments]
  )

  const activePresence = useMemo(
    () =>
      (document?.presence ?? []).filter(
        (entry) => entry.sessionId !== identity?.sessionId
      ),
    [document?.presence, identity?.sessionId]
  )

  const authors = useMemo(() => {
    const map = new Map<string, { name: string; company: CompanyId }>()

    for (const segment of segments) {
      map.set(segment.sessionId, {
        name: segment.name,
        company: segment.company,
      })
    }

    return [...map.entries()].map(([sessionId, author]) => ({
      sessionId,
      ...author,
    }))
  }, [segments])

  if (!isConvexEnabled) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <AppNav />
            <h1 className="text-2xl font-semibold tracking-tight">
              Collaborative text
            </h1>
          </div>
        </header>
        <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Convex is not connected. Run{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            npm run dev
          </code>{" "}
          to enable real-time collaborative editing.
        </div>
      </div>
    )
  }

  return (
    <>
      <TextIdentityDialog
        open={!identity}
        onContinue={(nextIdentity) => {
          setIdentity({
            sessionId: getTextSessionId(),
            ...nextIdentity,
          })
        }}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <AppNav />
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Collaborative text
              </h1>
              <p className="text-sm text-muted-foreground">
                Edit shared MDX-style notes with live authorship and activity.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {identity ? (
              <Badge className={getAuthorLabelClassName(identity.company)}>
                {identity.name} · {getCompanyLabel(identity.company)}
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuthorship((value) => !value)}
            >
              {showAuthorship ? "Hide authorship" : "Show authorship"}
            </Button>
          </div>
        </header>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        {!document ? (
          <div className="flex min-h-48 items-center justify-center rounded-xl border">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">Editing as you</span>
                {activePresence.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      with
                    </span>
                    {activePresence.map((entry) => (
                      <Badge
                        key={entry.sessionId}
                        className={getAuthorLabelClassName(entry.company)}
                      >
                        {entry.name}
                        <span className="text-muted-foreground">
                          · line {getLineNumber(document.content, entry.cursor)}
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    — no one else is here right now
                  </span>
                )}
              </div>

              <Textarea
                ref={textareaRef}
                value={draftText}
                onChange={(event) => {
                  void handleChange(event.target.value)
                }}
                onFocus={() => {
                  isFocusedRef.current = true
                  void pushPresence()
                }}
                onBlur={() => {
                  isFocusedRef.current = false
                }}
                onSelect={() => {
                  lastInteractionRef.current = Date.now()
                  void pushPresence()
                }}
                onKeyUp={() => {
                  void pushPresence()
                }}
                onClick={() => {
                  void pushPresence()
                }}
                spellCheck
                className="min-h-[28rem] font-mono text-sm leading-6"
                placeholder="Start writing..."
                disabled={!identity}
              />

              {showAuthorship ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-medium">Authorship view</h2>
                    <span className="text-xs text-muted-foreground">
                      Colored spans show who wrote each passage
                    </span>
                  </div>
                  <AttributedTextView segments={segments} />
                </div>
              ) : null}
            </div>

            <aside className="flex flex-col gap-4">
              <section className="rounded-xl border bg-background p-4">
                <h2 className="text-sm font-medium">Contributors</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {authors.length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      No contributors yet.
                    </li>
                  ) : (
                    authors.map((author) => (
                      <li
                        key={author.sessionId}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={cn(
                            "size-2.5 rounded-full",
                            getAuthorTint(author.sessionId)
                          )}
                        />
                        <span>{author.name}</span>
                        <span className="text-muted-foreground">
                          {getCompanyLabel(author.company)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              <section className="rounded-xl border bg-background p-4">
                <h2 className="text-sm font-medium">Recent edits</h2>
                <ul className="mt-3 flex max-h-[32rem] flex-col gap-3 overflow-y-auto">
                  {(document.edits ?? []).length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      Edits will appear here in real time.
                    </li>
                  ) : (
                    document.edits.map((edit) => (
                      <li key={edit._id} className="text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={getAuthorLabelClassName(edit.company)}
                          >
                            {edit.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(edit.createdAt, now)}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {edit.summary}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
