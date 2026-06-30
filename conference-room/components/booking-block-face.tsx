import { Badge } from "@/components/ui/badge"
import { getCompanyLabel, formatTimeRange } from "@/lib/constants"
import type { Booking } from "@/lib/types"

function companyBadgeVariant(company: string) {
  if (company === "nilo") {
    return "default" as const
  }
  if (company === "first-plug") {
    return "secondary" as const
  }
  return "outline" as const
}

type BookingBlockFaceProps = {
  booking: Booking
  slotTime: string
  slotCount: number
}

export function BookingBlockFace({
  booking,
  slotTime,
  slotCount,
}: BookingBlockFaceProps) {
  return (
    <>
      <span className="truncate text-sm font-medium">{booking.name}</span>
      <Badge variant={companyBadgeVariant(booking.company)} className="w-fit">
        {getCompanyLabel(booking.company)}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {formatTimeRange(slotTime, slotCount)}
      </span>
      {booking.note ? (
        <span className="line-clamp-3 text-xs text-muted-foreground">
          {booking.note}
        </span>
      ) : null}
    </>
  )
}
