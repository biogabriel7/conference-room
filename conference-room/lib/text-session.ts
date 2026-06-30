import type { CompanyId } from "@/lib/constants"

const SESSION_KEY = "conference-room-text-session"
const IDENTITY_KEY = "conference-room-text-identity"

export type TextIdentity = {
  sessionId: string
  name: string
  company: CompanyId
}

function createSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getTextSessionId() {
  if (typeof window === "undefined") {
    return "server"
  }

  const existing = window.localStorage.getItem(SESSION_KEY)

  if (existing) {
    return existing
  }

  const sessionId = createSessionId()
  window.localStorage.setItem(SESSION_KEY, sessionId)
  return sessionId
}

export function getStoredTextIdentity(): Omit<TextIdentity, "sessionId"> | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.localStorage.getItem(IDENTITY_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Omit<TextIdentity, "sessionId">

    if (!parsed.name || !parsed.company) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function storeTextIdentity(identity: Omit<TextIdentity, "sessionId">) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export function getTextIdentity(): TextIdentity | null {
  const stored = getStoredTextIdentity()

  if (!stored) {
    return null
  }

  return {
    sessionId: getTextSessionId(),
    ...stored,
  }
}

export function computeTextDiff(
  previousText: string,
  nextText: string
): { start: number; end: number; insertText: string } | null {
  if (previousText === nextText) {
    return null
  }

  let prefix = 0

  while (
    prefix < previousText.length &&
    prefix < nextText.length &&
    previousText[prefix] === nextText[prefix]
  ) {
    prefix += 1
  }

  let suffix = 0

  while (
    suffix < previousText.length - prefix &&
    suffix < nextText.length - prefix &&
    previousText[previousText.length - 1 - suffix] ===
      nextText[nextText.length - 1 - suffix]
  ) {
    suffix += 1
  }

  return {
    start: prefix,
    end: previousText.length - suffix,
    insertText: nextText.slice(prefix, nextText.length - suffix),
  }
}
