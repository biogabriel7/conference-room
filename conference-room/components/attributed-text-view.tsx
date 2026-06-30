import type { AttributedSegment } from "@/lib/text-authorship"
import { getAuthorTint } from "@/lib/text-authorship"
import { cn } from "@/lib/utils"

type AttributedTextViewProps = {
  segments: AttributedSegment[]
  className?: string
}

export function AttributedTextView({
  segments,
  className,
}: AttributedTextViewProps) {
  return (
    <div
      className={cn(
        "min-h-48 whitespace-pre-wrap break-words rounded-xl border bg-muted/20 p-4 font-mono text-sm leading-6",
        className
      )}
    >
      {segments.length === 0 ? (
        <span className="text-muted-foreground">No content yet.</span>
      ) : (
        segments.map((segment, index) => (
          <span
            key={`${segment.sessionId}-${index}`}
            title={`${segment.name}`}
            className={cn(
              "rounded-sm px-0.5 transition-colors",
              getAuthorTint(segment.sessionId)
            )}
          >
            {segment.text}
          </span>
        ))
      )}
    </div>
  )
}
