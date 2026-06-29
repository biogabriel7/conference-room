import type { CompanyId, TimeSlot } from "@/lib/constants"

export type Booking = {
  id: string
  slotDate: string
  slotTime: TimeSlot
  name: string
  company: CompanyId
  note: string
  createdAt: string
}
