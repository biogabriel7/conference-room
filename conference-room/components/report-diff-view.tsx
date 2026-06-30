import { useMemo } from "react"

import { diffWords, hasChanges } from "@/lib/text-diff"
import { cn } from "@/lib/utils"

type ReportDiffViewProps = {
  baseline: string
  current: string
  className?: string
}

export function ReportDiffView({
  baseline,
  current,
  className,
}: ReportDiffViewProps) {
  const tokens = useMemo(
    () => diffWords(baseline, current),
    [baseline, current]
  )

  if (!hasChanges(tokens)) {
    return (
      <div
        className={cn(
          "min-h-48 rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground",
          className
        )}
      >
        No changes since the last locked version.
      </div>
    )
  }

  return (
    <div
      className={cn(
        "min-h-48 whitespace-pre-wrap break-words rounded-xl border bg-muted/20 p-4 font-mono text-sm leading-6",
        className
      )}
    >
      {tokens.map((token, index) => {
        if (token.type === "added") {
          return (
            <span
              key={index}
              className="rounded-sm bg-emerald-500/20 text-emerald-900 dark:text-emerald-100"
            >
              {token.text}
            </span>
          )
        }

        if (token.type === "removed") {
          return (
            <span
              key={index}
              className="rounded-sm bg-rose-500/20 text-rose-900 line-through decoration-rose-500/70 dark:text-rose-100"
            >
              {token.text}
            </span>
          )
        }

        return <span key={index}>{token.text}</span>
      })}
    </div>
  )
}
