import type { Id } from "@/convex/_generated/dataModel"

import type { CompanyId, TimeSlot } from "@/lib/constants"

export type Booking = {
  id: Id<"bookings">
  slotDate: string
  slotTime: TimeSlot
  name: string
  company: CompanyId
  note: string
  createdAt: string
}
