import { cronJobs } from "convex/server"

import { internal } from "./_generated/api"

const crons = cronJobs()

// Saturday 11pm in Buenos Aires (UTC-3) is Sunday 02:00 UTC. Once the work week
// is over, drop the previous week's bookings so we never accumulate past weeks.
crons.weekly(
  "purge past weeks",
  { dayOfWeek: "sunday", hourUTC: 2, minuteUTC: 0 },
  internal.bookings.purgePastWeeks
)

export default crons
