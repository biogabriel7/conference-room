import { useCallback, useEffect, useRef } from "react"

import { computeTextDiff, type TextIdentity } from "@/lib/text-session"

const SYNC_DEBOUNCE_MS = 350
const ACTIVITY_IDLE_MS = 2_500
const PRESENCE_THROTTLE_MS = 1_200

type ApplyEditArgs = {
  sessionId: string
  name: string
  company: TextIdentity["company"]
  start: number
  end: number
  insertText: string
}

type UseCollaborativeTextSyncOptions = {
  identity: TextIdentity | null
  remoteContent: string | undefined
  applyEdit: (args: ApplyEditArgs) => Promise<unknown>
  recordEditBurst: (args: {
    sessionId: string
    name: string
    company: TextIdentity["company"]
    baselineText: string
  }) => Promise<unknown>
  updatePresence: (args: {
    sessionId: string
    name: string
    company: TextIdentity["company"]
    cursor: number
    selectionStart: number
    selectionEnd: number
  }) => Promise<unknown>
  getCursor: () => {
    cursor: number
    selectionStart: number
    selectionEnd: number
  }
}

export function useCollaborativeTextSync({
  identity,
  remoteContent,
  applyEdit,
  recordEditBurst,
  updatePresence,
  getCursor,
}: UseCollaborativeTextSyncOptions) {
  const committedTextRef = useRef("")
  const activityBaselineRef = useRef<string | null>(null)
  const syncTimerRef = useRef<number | null>(null)
  const activityTimerRef = useRef<number | null>(null)
  const presenceTimerRef = useRef<number | null>(null)
  const lastPresenceAtRef = useRef(0)
  const inFlightSyncRef = useRef(false)
  const pendingDraftRef = useRef<string | null>(null)
  const isFocusedRef = useRef(false)
  const lastInteractionRef = useRef(0)

  useEffect(() => {
    if (remoteContent === undefined) {
      return
    }

    const recentlyEdited =
      Date.now() - lastInteractionRef.current < 2_000 && isFocusedRef.current

    if (recentlyEdited && remoteContent !== committedTextRef.current) {
      return
    }

    if (remoteContent === committedTextRef.current) {
      return
    }

    committedTextRef.current = remoteContent

    if (activityBaselineRef.current === null) {
      activityBaselineRef.current = remoteContent
    }
  }, [remoteContent])

  const clearSyncTimer = useCallback(() => {
    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
  }, [])

  const clearActivityTimer = useCallback(() => {
    if (activityTimerRef.current !== null) {
      window.clearTimeout(activityTimerRef.current)
      activityTimerRef.current = null
    }
  }, [])

  const flushActivity = useCallback(
    async (draftText: string) => {
      if (!identity) {
        return
      }

      const baseline = activityBaselineRef.current

      if (baseline === null || baseline === draftText) {
        activityBaselineRef.current = draftText
        return
      }

      try {
        await recordEditBurst({
          sessionId: identity.sessionId,
          name: identity.name,
          company: identity.company,
          baselineText: baseline,
        })
        activityBaselineRef.current = draftText
      } catch {
        // Activity logging is best-effort.
      }
    },
    [identity, recordEditBurst]
  )

  const flushSync = useCallback(
    async (draftText: string) => {
      if (!identity) {
        return draftText
      }

      if (inFlightSyncRef.current) {
        pendingDraftRef.current = draftText
        return draftText
      }

      const committed = committedTextRef.current
      const diff = computeTextDiff(committed, draftText)

      if (!diff) {
        return draftText
      }

      inFlightSyncRef.current = true

      try {
        await applyEdit({
          sessionId: identity.sessionId,
          name: identity.name,
          company: identity.company,
          start: diff.start,
          end: diff.end,
          insertText: diff.insertText,
        })
        committedTextRef.current = draftText
      } catch {
        throw new Error("Could not save your edit.")
      } finally {
        inFlightSyncRef.current = false

        const pending = pendingDraftRef.current
        pendingDraftRef.current = null

        if (pending !== null && pending !== committedTextRef.current) {
          void flushSync(pending).catch(() => {
            // Error surfaced by the caller on the next explicit flush.
          })
        }
      }

      return draftText
    },
    [applyEdit, identity]
  )

  const scheduleSync = useCallback(
    (draftText: string) => {
      clearSyncTimer()
      syncTimerRef.current = window.setTimeout(() => {
        void flushSync(draftText)
      }, SYNC_DEBOUNCE_MS)
    },
    [clearSyncTimer, flushSync]
  )

  const scheduleActivity = useCallback(
    (draftText: string) => {
      clearActivityTimer()
      activityTimerRef.current = window.setTimeout(() => {
        void flushActivity(draftText)
      }, ACTIVITY_IDLE_MS)
    },
    [clearActivityTimer, flushActivity]
  )

  const pushPresence = useCallback(
    async (force = false) => {
      if (!identity) {
        return
      }

      const now = Date.now()

      if (!force && now - lastPresenceAtRef.current < PRESENCE_THROTTLE_MS) {
        return
      }

      lastPresenceAtRef.current = now
      const { cursor, selectionStart, selectionEnd } = getCursor()

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
    },
    [getCursor, identity, updatePresence]
  )

  const schedulePresence = useCallback(() => {
    if (presenceTimerRef.current !== null) {
      return
    }

    presenceTimerRef.current = window.setTimeout(() => {
      presenceTimerRef.current = null
      void pushPresence()
    }, PRESENCE_THROTTLE_MS)
  }, [pushPresence])

  const handleDraftChange = useCallback(
    (draftText: string) => {
      lastInteractionRef.current = Date.now()

      if (activityBaselineRef.current === null) {
        activityBaselineRef.current = committedTextRef.current
      }

      scheduleSync(draftText)
      scheduleActivity(draftText)
      schedulePresence()
    },
    [scheduleActivity, schedulePresence, scheduleSync]
  )

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true
    void pushPresence(true)
  }, [pushPresence])

  const handleBlur = useCallback(
    async (draftText: string) => {
      isFocusedRef.current = false
      clearSyncTimer()
      clearActivityTimer()

      try {
        await flushSync(draftText)
        await flushActivity(draftText)
        void pushPresence(true)
      } catch (error) {
        throw error
      }
    },
    [
      clearActivityTimer,
      clearSyncTimer,
      flushActivity,
      flushSync,
      pushPresence,
    ]
  )

  const handleCursorChange = useCallback(() => {
    lastInteractionRef.current = Date.now()
    schedulePresence()
  }, [schedulePresence])

  const initializeDraft = useCallback((content: string) => {
    committedTextRef.current = content
    activityBaselineRef.current = content
    return content
  }, [])

  useEffect(() => {
    return () => {
      clearSyncTimer()
      clearActivityTimer()

      if (presenceTimerRef.current !== null) {
        window.clearTimeout(presenceTimerRef.current)
      }
    }
  }, [clearActivityTimer, clearSyncTimer])

  return {
    handleDraftChange,
    handleFocus,
    handleBlur,
    handleCursorChange,
    initializeDraft,
    pushPresence,
    isFocusedRef,
    lastInteractionRef,
  }
}

export const PRESENCE_KEEPALIVE_MS = 5_000
export const PRESENCE_QUERY_TICK_MS = 12_000
export const PRESENCE_STALE_MS = 30_000
