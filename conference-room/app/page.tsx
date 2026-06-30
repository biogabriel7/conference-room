import { TimetablePageClient } from "@/components/timetable-page-client"
import { parseWeekParam } from "@/lib/week"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const params = await searchParams
  const weekStart = parseWeekParam(params.week)

  return <TimetablePageClient weekStart={weekStart} />
}
