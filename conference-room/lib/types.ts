import type { CompanyId, TimeSlot } from "@/lib/constants"

export type Booking = {
  id: number
  slotDate: string
  slotTime: TimeSlot
  name: string
  company: CompanyId
  note: string
  createdAt: string
}

export type BookingInput = {
  slotDate: string
  slotTime: TimeSlot
  name: string
  company: CompanyId
  note: string
}
