import { neon } from "@neondatabase/serverless"

import type { Booking, BookingInput } from "@/lib/types"

function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set")
  }
  return neon(url)
}

let schemaReady: Promise<void> | null = null

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = getSql()
      await sql`
        CREATE TABLE IF NOT EXISTS bookings (
          id SERIAL PRIMARY KEY,
          slot_date DATE NOT NULL,
          slot_time TIME NOT NULL,
          name TEXT NOT NULL,
          company TEXT NOT NULL,
          note TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (slot_date, slot_time)
        )
      `
    })()
  }

  await schemaReady
}

function mapBooking(row: {
  id: number
  slot_date: string | Date
  slot_time: string
  name: string
  company: string
  note: string
  created_at: string | Date
}): Booking {
  const slotDate =
    row.slot_date instanceof Date
      ? row.slot_date.toISOString().slice(0, 10)
      : String(row.slot_date).slice(0, 10)

  const slotTime = String(row.slot_time).slice(0, 5)
  const createdAt =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at)

  return {
    id: row.id,
    slotDate,
    slotTime: slotTime as Booking["slotTime"],
    name: row.name,
    company: row.company as Booking["company"],
    note: row.note,
    createdAt,
  }
}

export async function getBookingsForWeek(startDate: string, endDate: string) {
  await ensureSchema()
  const sql = getSql()
  const rows = await sql`
    SELECT id, slot_date, slot_time, name, company, note, created_at
    FROM bookings
    WHERE slot_date >= ${startDate}::date
      AND slot_date <= ${endDate}::date
    ORDER BY slot_date ASC, slot_time ASC
  `

  return (rows as Array<Parameters<typeof mapBooking>[0]>).map(mapBooking)
}

export async function createBooking(input: BookingInput) {
  await ensureSchema()
  const sql = getSql()
  const rows = await sql`
    INSERT INTO bookings (slot_date, slot_time, name, company, note)
    VALUES (
      ${input.slotDate}::date,
      ${input.slotTime}::time,
      ${input.name},
      ${input.company},
      ${input.note}
    )
    RETURNING id, slot_date, slot_time, name, company, note, created_at
  `

  return mapBooking(rows[0] as Parameters<typeof mapBooking>[0])
}

export async function deleteBooking(id: number) {
  await ensureSchema()
  const sql = getSql()
  await sql`DELETE FROM bookings WHERE id = ${id}`
}
