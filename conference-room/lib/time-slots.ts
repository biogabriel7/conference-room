export const SLOT_DURATION_MINUTES = 15

const DAY_START_MINUTES = 8 * 60
const DAY_END_MINUTES = 17 * 60

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function generateTimeSlots() {
  const slots: string[] = []

  for (
    let minutes = DAY_START_MINUTES;
    minutes <= DAY_END_MINUTES;
    minutes += SLOT_DURATION_MINUTES
  ) {
    slots.push(minutesToTime(minutes))
  }

  return slots
}

export const TIME_SLOTS = generateTimeSlots()

export type TimeSlot = (typeof TIME_SLOTS)[number]

export function getSlotIndex(time: string) {
  return TIME_SLOTS.indexOf(time as TimeSlot)
}

export function getSlotCount(startTime: string, endTime: string) {
  const startIndex = getSlotIndex(startTime)
  const endIndex = getSlotIndex(endTime)

  if (startIndex === -1 || endIndex === -1) {
    return 1
  }

  return Math.abs(endIndex - startIndex) + 1
}

export function getOrderedSlotRange(startTime: string, endTime: string) {
  const startIndex = getSlotIndex(startTime)
  const endIndex = getSlotIndex(endTime)

  if (startIndex === -1 || endIndex === -1) {
    return { startTime, endTime, slotCount: 1 }
  }

  const from = Math.min(startIndex, endIndex)
  const to = Math.max(startIndex, endIndex)

  return {
    startTime: TIME_SLOTS[from],
    endTime: TIME_SLOTS[to],
    slotCount: to - from + 1,
  }
}

export function getSlotsForBooking(startTime: string, slotCount: number) {
  const startIndex = getSlotIndex(startTime)

  if (startIndex === -1 || slotCount < 1) {
    return [startTime]
  }

  return TIME_SLOTS.slice(startIndex, startIndex + slotCount)
}

export function formatTimeSlot(time: string) {
  const [hours, minutes] = time.split(":")
  const hour = Number.parseInt(hours, 10)
  const suffix = hour >= 12 ? "pm" : "am"
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  if (minutes === "00") {
    return `${displayHour}${suffix}`
  }
  return `${displayHour}:${minutes}${suffix}`
}

export function formatTimeRange(startTime: string, slotCount: number) {
  const slots = getSlotsForBooking(startTime, slotCount)
  const start = formatTimeSlot(slots[0])
  const endMinutes =
    timeToMinutes(slots[slots.length - 1]) + SLOT_DURATION_MINUTES
  const end = formatTimeSlot(minutesToTime(endMinutes))

  if (slotCount === 1) {
    return start
  }

  return `${start} – ${end}`
}

export function getResizeSlotCount(
  booking: BookingLike,
  targetSlotTime: string,
  slotToBooking: Map<string, BookingLike>
) {
  const startIndex = getSlotIndex(booking.slotTime)
  const targetIndex = getSlotIndex(targetSlotTime)

  if (startIndex === -1 || targetIndex === -1 || targetIndex < startIndex) {
    return booking.slotCount ?? 1
  }

  let validCount = booking.slotCount ?? 1

  for (let index = startIndex; index <= targetIndex; index += 1) {
    const slot = TIME_SLOTS[index]
    const occupier = slotToBooking.get(slot)

    if (occupier && occupier !== booking) {
      break
    }

    validCount = index - startIndex + 1
  }

  return validCount
}

type BookingLike = {
  slotDate: string
  slotTime: string
  slotCount?: number
}

export function buildDaySlotMaps<T extends BookingLike>(
  bookings: T[],
  slotDate: string
) {
  const startBySlot = new Map<string, T>()
  const continuationSlots = new Set<string>()
  const occupiedSlots = new Set<string>()
  const slotToBooking = new Map<string, T>()

  for (const booking of bookings) {
    if (booking.slotDate !== slotDate) {
      continue
    }

    const slotCount = booking.slotCount ?? 1
    const slots = getSlotsForBooking(booking.slotTime, slotCount)

    startBySlot.set(slots[0], booking)

    for (const slot of slots) {
      occupiedSlots.add(slot)
      slotToBooking.set(slot, booking)
    }

    for (let index = 1; index < slots.length; index += 1) {
      continuationSlots.add(slots[index])
    }
  }

  return { startBySlot, continuationSlots, occupiedSlots, slotToBooking }
}
