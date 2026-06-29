"use client"

import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

import { ConvexTimetable } from "@/components/convex-timetable"
import { LocalTimetable } from "@/components/local-timetable"
import { Spinner } from "@/components/ui/spinner"
import { isConvexEnabled } from "@/lib/convex-config"
import { parseWeekParam } from "@/lib/week"

function TimetableContent() {
  const searchParams = useSearchParams()
  const weekStart = parseWeekParam(searchParams.get("week") ?? undefined)

  if (isConvexEnabled) {
    return <ConvexTimetable weekStart={weekStart} />
  }

  return <LocalTimetable weekStart={weekStart} />
}

export function TimetablePage() {
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
