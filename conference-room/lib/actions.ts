"use server"

import { revalidatePath } from "next/cache"

import type { CompanyId, TimeSlot } from "@/lib/constants"
import { createBooking, deleteBooking } from "@/lib/db"

export async function bookSlot(formData: FormData) {
  const slotDate = String(formData.get("slotDate") ?? "")
  const slotTime = String(formData.get("slotTime") ?? "") as TimeSlot
  const name = String(formData.get("name") ?? "").trim()
  const company = String(formData.get("company") ?? "") as CompanyId
  const note = String(formData.get("note") ?? "").trim()

  if (!slotDate || !slotTime || !name || !company) {
    return { error: "Name and company are required." }
  }

  try {
    await createBooking({ slotDate, slotTime, name, company, note })
    revalidatePath("/")
    return { success: true }
  } catch {
    return { error: "That slot is already booked." }
  }
}

export async function removeBooking(id: number) {
  try {
    await deleteBooking(id)
    revalidatePath("/")
    return { success: true }
  } catch {
    return { error: "Could not remove booking." }
  }
}
