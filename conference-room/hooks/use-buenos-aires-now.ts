"use client"

import { useEffect, useState } from "react"

import { getBuenosAiresNow, type BuenosAiresNow } from "@/lib/buenos-aires"

/** Tracks the current Buenos Aires time, refreshing every minute. */
export function useBuenosAiresNow(): BuenosAiresNow {
  const [now, setNow] = useState(() => getBuenosAiresNow())

  useEffect(() => {
    const id = setInterval(() => setNow(getBuenosAiresNow()), 60_000)
    return () => clearInterval(id)
  }, [])

  return now
}
