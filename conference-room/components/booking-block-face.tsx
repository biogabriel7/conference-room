import { Badge } from "@/components/ui/badge"
import {
  getCompanyBadgeClassName,
  getCompanyLabel,
  formatTimeRange,
} from "@/lib/constants"
import type { Booking } from "@/lib/types"
import { cn } from "@/lib/utils"

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
  if (slotCount === 1) {
    return null
  }

  return (
    <>
      <span className="truncate text-sm font-medium">{booking.name}</span>
      <Badge
        variant="outline"
        className={cn("w-fit", getCompanyBadgeClassName(booking.company))}
      >
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
