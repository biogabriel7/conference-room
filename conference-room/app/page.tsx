import { Timetable } from "@/components/timetable"
import { getBookingsForWeek } from "@/lib/db"
import { getWeekdayDates, parseWeekParam, toDateKey } from "@/lib/week"

type PageProps = {
  searchParams: Promise<{ week?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams
  const weekStart = parseWeekParam(params.week)
  const weekDays = getWeekdayDates(weekStart)
  const startDate = toDateKey(weekDays[0])
  const endDate = toDateKey(weekDays[4])

  let bookings: Awaited<ReturnType<typeof getBookingsForWeek>> = []

  if (process.env.DATABASE_URL) {
    try {
      bookings = await getBookingsForWeek(startDate, endDate)
    } catch (error) {
      console.error(error)
    }
  }

  if (!process.env.DATABASE_URL) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="flex max-w-md flex-col gap-2 text-sm">
          <h1 className="font-medium">Conference room</h1>
          <p className="text-muted-foreground">
            Add a Neon Postgres database and set{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              DATABASE_URL
            </code>{" "}
            to enable shared bookings.
          </p>
        </div>
      </div>
    )
  }

  return <Timetable weekStart={weekStart} bookings={bookings} />
}
