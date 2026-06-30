export type TextSegment = {
  sessionId: string
  name: string
  company: "nilo" | "first-plug" | "volantis"
  text: string
}

export function joinSegments(segments: TextSegment[]) {
  return segments.map((segment) => segment.text).join("")
}

export function mergeAdjacentSegments(segments: TextSegment[]) {
  if (segments.length === 0) {
    return segments
  }

  const merged: TextSegment[] = [segments[0]]

  for (let index = 1; index < segments.length; index += 1) {
    const current = segments[index]
    const previous = merged[merged.length - 1]

    if (
      previous.sessionId === current.sessionId &&
      previous.name === current.name &&
      previous.company === current.company
    ) {
      previous.text += current.text
      continue
    }

    merged.push({ ...current })
  }

  return merged
}

export function applyEditToSegments(
  segments: TextSegment[],
  start: number,
  end: number,
  insertText: string,
  author: Pick<TextSegment, "sessionId" | "name" | "company">
) {
  if (start < 0 || end < start) {
    throw new Error("Invalid edit range.")
  }

  const content = joinSegments(segments)

  if (end > content.length) {
    throw new Error("Edit range exceeds document length.")
  }

  if (start === end && insertText.length === 0) {
    return segments
  }

  const nextSegments: TextSegment[] = []
  let offset = 0

  for (const segment of segments) {
    const segmentStart = offset
    const segmentEnd = offset + segment.text.length
    offset = segmentEnd

    if (segmentEnd <= start || segmentStart >= end) {
      nextSegments.push({ ...segment })
      continue
    }

    const localStart = Math.max(0, start - segmentStart)
    const localEnd = Math.min(segment.text.length, end - segmentStart)
    const before = segment.text.slice(0, localStart)
    const after = segment.text.slice(localEnd)

    if (before) {
      nextSegments.push({ ...segment, text: before })
    }

    if (segmentStart <= start && start < segmentEnd && insertText) {
      nextSegments.push({
        sessionId: author.sessionId,
        name: author.name,
        company: author.company,
        text: insertText,
      })
    }

    if (after) {
      nextSegments.push({ ...segment, text: after })
    }
  }

  if (start === content.length && insertText) {
    nextSegments.push({
      sessionId: author.sessionId,
      name: author.name,
      company: author.company,
      text: insertText,
    })
  }

  return mergeAdjacentSegments(nextSegments)
}

function normalizeWhitespace(text: string) {
  return text.replace(/\s+/g, " ").trim()
}

function truncatePhrase(text: string, maxLength = 72) {
  const normalized = normalizeWhitespace(text)

  if (!normalized) {
    return '""'
  }

  if (normalized.length <= maxLength) {
    return `"${normalized}"`
  }

  return `"${normalized.slice(0, maxLength)}…"`
}

function getContextBefore(text: string, position: number, maxChars = 48) {
  const slice = text.slice(Math.max(0, position - maxChars), position)
  const normalized = normalizeWhitespace(slice)

  if (!normalized) {
    return null
  }

  const words = normalized.split(" ")
  const snippet = words.slice(-5).join(" ")

  if (snippet.length <= 40) {
    return snippet
  }

  return `…${snippet.slice(-40)}`
}

function describeAddedText(added: string) {
  if (!added) {
    return null
  }

  const lines = added.split("\n").map((line) => line.trimEnd())
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)

  if (nonEmptyLines.length > 1) {
    return `added ${nonEmptyLines.length} lines starting with ${truncatePhrase(nonEmptyLines[0], 56)}`
  }

  if (added.includes("\n")) {
    return `added a new line: ${truncatePhrase(nonEmptyLines[0] ?? lines[0] ?? added, 56)}`
  }

  return `added ${truncatePhrase(added)}`
}

function describeRemovedText(removed: string) {
  if (!removed) {
    return null
  }

  const lines = removed.split("\n").map((line) => line.trimEnd())
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0)

  if (nonEmptyLines.length > 1) {
    return `removed ${nonEmptyLines.length} lines including ${truncatePhrase(nonEmptyLines[0], 56)}`
  }

  if (removed.includes("\n")) {
    return `removed a line: ${truncatePhrase(nonEmptyLines[0] ?? lines[0] ?? removed, 56)}`
  }

  return `removed ${truncatePhrase(removed)}`
}

export function summarizeEdit(previousText: string, nextText: string) {
  if (previousText === nextText) {
    return "made no changes"
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

  const removed = previousText.slice(prefix, previousText.length - suffix)
  const added = nextText.slice(prefix, nextText.length - suffix)
  const context = getContextBefore(previousText, prefix)
  const contextSuffix = context ? ` after "${context}"` : ""

  if (removed && added) {
    const removedNormalized = normalizeWhitespace(removed)
    const addedNormalized = normalizeWhitespace(added)

    if (removedNormalized && removedNormalized === addedNormalized) {
      return `reformatted text${contextSuffix}`
    }

    return `replaced ${truncatePhrase(removed)} with ${truncatePhrase(added)}${contextSuffix}`
  }

  if (added) {
    return `${describeAddedText(added)}${contextSuffix}`
  }

  if (removed) {
    return `${describeRemovedText(removed)}${contextSuffix}`
  }

  return "updated the document"
}
