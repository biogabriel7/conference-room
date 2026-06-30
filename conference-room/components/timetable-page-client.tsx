"use client"

import dynamic from "next/dynamic"

import { LocalTimetable } from "@/components/local-timetable"
import { Spinner } from "@/components/ui/spinner"
import { isConvexEnabled } from "@/lib/convex-config"

const ConvexTimetable = dynamic(
  () =>
    import("@/components/convex-timetable").then((module) => ({
      default: module.ConvexTimetable,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    ),
  }
)

type TimetablePageClientProps = {
  weekStart: Date
}

export function TimetablePageClient({ weekStart }: TimetablePageClientProps) {
  if (isConvexEnabled) {
    return <ConvexTimetable weekStart={weekStart} />
  }

  return <LocalTimetable weekStart={weekStart} />
}
