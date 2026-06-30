"use client"

import { isConvexEnabled } from "@/lib/convex-config"

import { ConvexTimetable } from "@/components/convex-timetable"
import { LocalTimetable } from "@/components/local-timetable"

type TimetablePageClientProps = {
  weekStart: Date
}

export function TimetablePageClient({ weekStart }: TimetablePageClientProps) {
  if (isConvexEnabled) {
    return <ConvexTimetable weekStart={weekStart} />
  }

  return <LocalTimetable weekStart={weekStart} />
}
