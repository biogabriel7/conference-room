import type { CompanyId } from "@/lib/constants"
import { getCompanyBadgeClassName } from "@/lib/constants"

export type AttributedSegment = {
  sessionId: string
  name: string
  company: CompanyId
  text: string
}

const AUTHOR_TINTS = [
  "bg-sky-500/15 dark:bg-sky-500/20",
  "bg-amber-500/15 dark:bg-amber-500/20",
  "bg-violet-500/15 dark:bg-violet-500/20",
  "bg-emerald-500/15 dark:bg-emerald-500/20",
  "bg-rose-500/15 dark:bg-rose-500/20",
  "bg-cyan-500/15 dark:bg-cyan-500/20",
]

export function getAuthorTint(sessionId: string) {
  let hash = 0

  for (let index = 0; index < sessionId.length; index += 1) {
    hash = (hash + sessionId.charCodeAt(index) * (index + 1)) % AUTHOR_TINTS.length
  }

  return AUTHOR_TINTS[hash]
}

export function getAuthorLabelClassName(company: CompanyId | string) {
  return getCompanyBadgeClassName(company)
}
