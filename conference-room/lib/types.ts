import type { CompanyId, TimeSlot } from "@/lib/constants"

export type Booking = {
  id: string
  slotDate: string
  slotTime: TimeSlot
  slotCount: number
  name: string
  company: CompanyId
  note: string
  createdAt: string
  /** Set on create and whenever the slot position changes. */
  slotChangedAt?: string
  seriesId?: string
}
