"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { Timetable } from "@/components/timetable"
import { Spinner } from "@/components/ui/spinner"
import { parseWeekParam } from "@/lib/week"

function TimetableContent() {
  const searchParams = useSearchParams()
  const weekStart = parseWeekParam(searchParams.get("week") ?? undefined)

  return <Timetable weekStart={weekStart} />
}

export function TimetablePage() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="flex max-w-md flex-col gap-2 text-sm">
          <h1 className="font-medium">Conference room</h1>
          <p className="text-muted-foreground">
            Run{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              npx convex dev
            </code>{" "}
            locally, or set{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_CONVEX_URL
            </code>{" "}
            on Vercel after linking Convex.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <TimetableContent />
    </Suspense>
  )
}
