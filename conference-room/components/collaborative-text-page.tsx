"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"

import { AppNav } from "@/components/app-nav"
import { AttributedTextView } from "@/components/attributed-text-view"
import { ReportDiffView } from "@/components/report-diff-view"
import { TextIdentityDialog } from "@/components/text-identity-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  PRESENCE_KEEPALIVE_MS,
  PRESENCE_QUERY_TICK_MS,
  useCollaborativeTextSync,
} from "@/hooks/use-collaborative-text-sync"
import { getCompanyLabel } from "@/lib/constants"
import type { CompanyId } from "@/lib/constants"
import { isConvexEnabled } from "@/lib/convex-config"
import {
  getAuthorLabelClassName,
  getAuthorTint,
  type AttributedSegment,
} from "@/lib/text-authorship"
import {
  getStoredTextIdentity,
  getTextSessionId,
  type TextIdentity,
} from "@/lib/text-session"
import { cn } from "@/lib/utils"

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
  const [hasInitializedDraft, setHasInitializedDraft] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const textContent = useQuery(
    api.text.getTextContent,
    isConvexEnabled ? {} : "skip"
  )
  const textMeta = useQuery(
    api.text.getTextMeta,
    isConvexEnabled ? { now } : "skip"
  )

  const ensureDocument = useMutation(api.text.ensureDocument)
  const applyEdit = useMutation(api.text.applyEdit)
  const recordEditBurst = useMutation(api.text.recordEditBurst)
  const updatePresence = useMutation(api.text.updatePresence)
  const leavePresence = useMutation(api.text.leavePresence)
  const restoreToEdit = useMutation(api.text.restoreToEdit)
  const lockDocument = useMutation(api.text.lockDocument)
  const reopenDocument = useMutation(api.text.reopenDocument)
  const resetDocument = useMutation(api.text.resetDocument)

  const handleRestore = useCallback(
    async (editId: Id<"textEdits">) => {
      if (!identity) {
        return
      }

      try {
        await restoreToEdit({
          editId,
          sessionId: identity.sessionId,
          name: identity.name,
          company: identity.company,
        })
        setError(null)
      } catch (restoreError) {
        setError(
          restoreError instanceof Error
            ? restoreError.message
            : "Could not restore that version."
        )
      }
    },
    [identity, restoreToEdit]
  )

  const handleLock = useCallback(async () => {
    if (!identity) {
      return
    }

    try {
      await lockDocument({
        sessionId: identity.sessionId,
        name: identity.name,
        company: identity.company,
      })
      setReviewMode(false)
      setError(null)
    } catch (lockError) {
      setError(
        lockError instanceof Error
          ? lockError.message
          : "Could not lock the report."
      )
    }
  }, [identity, lockDocument])

  const handleReopen = useCallback(async () => {
    if (!identity) {
      return
    }

    try {
      await reopenDocument({
        sessionId: identity.sessionId,
        name: identity.name,
        company: identity.company,
      })
      setError(null)
    } catch (reopenError) {
      setError(
        reopenError instanceof Error
          ? reopenError.message
          : "Could not reopen the report."
      )
    }
  }, [identity, reopenDocument])

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2_000)
    } catch {
      setError("Could not copy the link.")
    }
  }, [])

  const handleResetDemo = useCallback(async () => {
    // Two-click guard: arm first, then reset — avoids wiping a live session.
    if (!resetArmed) {
      setResetArmed(true)
      window.setTimeout(() => setResetArmed(false), 3_000)
      return
    }

    setResetArmed(false)

    try {
      await resetDocument({})
      setReviewMode(false)
      setError(null)
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not reset the demo."
      )
    }
  }, [resetArmed, resetDocument])

  const getCursor = useCallback(() => {
    const textarea = textareaRef.current
    const cursor = textarea?.selectionStart ?? draftText.length

    return {
      cursor,
      selectionStart: textarea?.selectionStart ?? cursor,
      selectionEnd: textarea?.selectionEnd ?? cursor,
    }
  }, [draftText.length])

  const {
    handleDraftChange,
    handleFocus,
    handleBlur,
    handleCursorChange,
    initializeDraft,
    pushPresence,
    isFocusedRef,
    lastInteractionRef,
  } = useCollaborativeTextSync({
    identity,
    remoteContent: textContent?.content,
    applyEdit,
    recordEditBurst,
    updatePresence,
    getCursor,
  })

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
    if (!textContent || hasInitializedDraft) {
      return
    }

    setDraftText(initializeDraft(textContent.content))
    setHasInitializedDraft(true)
  }, [hasInitializedDraft, initializeDraft, textContent])

  useEffect(() => {
    if (!textContent || !hasInitializedDraft) {
      return
    }

    const remoteContent = textContent.content
    const recentlyEdited =
      Date.now() - lastInteractionRef.current < 2_000 && isFocusedRef.current

    if (recentlyEdited && remoteContent !== draftText) {
      return
    }

    if (remoteContent !== draftText) {
      setDraftText(remoteContent)
      initializeDraft(remoteContent)
    }
  }, [
    draftText,
    hasInitializedDraft,
    initializeDraft,
    isFocusedRef,
    lastInteractionRef,
    textContent,
  ])

  useEffect(() => {
    if (!identity || !isConvexEnabled) {
      return
    }

    void pushPresence(true)
    const interval = window.setInterval(() => {
      void pushPresence()
    }, PRESENCE_KEEPALIVE_MS)

    return () => {
      window.clearInterval(interval)
      void leavePresence({ sessionId: identity.sessionId })
    }
  }, [identity, leavePresence, pushPresence])

  const segments = useMemo<AttributedSegment[]>(
    () => textContent?.segments ?? [],
    [textContent?.segments]
  )

  const activePresence = useMemo(
    () =>
      (textMeta?.presence ?? []).filter(
        (entry) => entry.sessionId !== identity?.sessionId
      ),
    [identity?.sessionId, textMeta?.presence]
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

  const isLocked = textContent?.status === "locked"

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
      {!identity ? (
        <TextIdentityDialog
          open
          onContinue={(nextIdentity) => {
            setIdentity({
              sessionId: getTextSessionId(),
              ...nextIdentity,
            })
          }}
        />
      ) : null}

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <AppNav />
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Collaborative text
              </h1>
              <p className="text-sm text-muted-foreground">
                Co-edit the report live, then review the changes and lock the
                official version.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {identity ? (
              <Badge className={getAuthorLabelClassName(identity.company)}>
                {identity.name} · {getCompanyLabel(identity.company)}
              </Badge>
            ) : null}
            {textContent && identity ? (
              isLocked ? (
                <Badge variant="outline">Locked</Badge>
              ) : reviewMode ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewMode(false)}
                >
                  Back to editing
                </Button>
              ) : (
                <Button size="sm" onClick={() => setReviewMode(true)}>
                  Review &amp; lock
                </Button>
              )
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAuthorship((value) => !value)}
            >
              {showAuthorship ? "Hide authorship" : "Show authorship"}
            </Button>
            <Button
              variant={resetArmed ? "destructive" : "ghost"}
              size="sm"
              onClick={() => void handleResetDemo()}
              title="Wipe edits and reseed the report"
            >
              {resetArmed ? "Confirm reset" : "Reset demo"}
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

        {!textContent || !textMeta ? (
          <div className="flex min-h-48 items-center justify-center rounded-xl border">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            {isLocked ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold">
                      Official version — locked
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Locked by {textContent.lockedByName ?? "someone"}
                      {textContent.lockedAt
                        ? ` · ${formatRelativeTime(textContent.lockedAt, now)}`
                        : ""}
                      . Editing is closed until someone reopens it.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleShare()}
                    >
                      {shareCopied ? "Link copied" : "Copy share link"}
                    </Button>
                    <Button size="sm" onClick={() => void handleReopen()}>
                      Reopen for editing
                    </Button>
                  </div>
                </div>
                <AttributedTextView segments={segments} />
              </div>
            ) : reviewMode ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-sm font-semibold">Review changes</h2>
                    <p className="text-sm text-muted-foreground">
                      Green is added, struck-through is removed — vs. the last
                      locked version.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReviewMode(false)}
                    >
                      Back to editing
                    </Button>
                    <Button size="sm" onClick={() => void handleLock()}>
                      Lock &amp; publish
                    </Button>
                  </div>
                </div>
                <ReportDiffView
                  baseline={textContent.baselineContent}
                  current={textContent.content}
                />
              </div>
            ) : (
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
                            · line{" "}
                            {getLineNumber(textContent.content, entry.cursor)}
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
                    const nextText = event.target.value
                    setDraftText(nextText)
                    setError(null)
                    handleDraftChange(nextText)
                  }}
                  onFocus={handleFocus}
                  onBlur={() => {
                    void handleBlur(draftText).catch((blurError) => {
                      setError(
                        blurError instanceof Error
                          ? blurError.message
                          : "Could not save your edit."
                      )
                    })
                  }}
                  onSelect={handleCursorChange}
                  onKeyUp={handleCursorChange}
                  onClick={handleCursorChange}
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
            )}

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
                  {(textMeta.edits ?? []).length === 0 ? (
                    <li className="text-sm text-muted-foreground">
                      Edits will appear here after you pause typing.
                    </li>
                  ) : (
                    textMeta.edits.map((edit, index) => (
                      <li key={edit._id} className="text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={getAuthorLabelClassName(edit.company)}
                          >
                            {edit.name}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(
                              edit.updatedAt ?? edit.createdAt,
                              now
                            )}
                          </span>
                          {edit.snapshot && index > 0 && !isLocked ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto h-6 px-2 text-xs"
                              onClick={() => void handleRestore(edit._id)}
                              disabled={!identity}
                            >
                              Restore
                            </Button>
                          ) : null}
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
