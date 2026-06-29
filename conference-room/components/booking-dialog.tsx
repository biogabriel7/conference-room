"use client"

import { useState } from "react"
import { useMutation } from "convex/react"

import { api } from "@/convex/_generated/api"
import { COMPANIES, formatTimeSlot, getCompanyLabel } from "@/lib/constants"
import type { CompanyId, TimeSlot } from "@/lib/constants"
import type { Booking } from "@/lib/types"
import { formatDay, formatWeekday } from "@/lib/week"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

type SlotSelection = {
  slotDate: string
  slotTime: TimeSlot
  booking?: Booking
}

type BookingDialogProps = {
  selection: SlotSelection | null
  onClose: () => void
}

export function BookingDialog({ selection, onClose }: BookingDialogProps) {
  const [name, setName] = useState("")
  const [company, setCompany] = useState<string>("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const createBooking = useMutation(api.bookings.create)
  const removeBooking = useMutation(api.bookings.remove)

  const open = selection !== null
  const booking = selection?.booking

  function resetForm() {
    setName("")
    setCompany("")
    setNote("")
    setError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm()
      onClose()
    }
  }

  async function handleBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selection) {
      return
    }

    setIsPending(true)
    setError(null)

    try {
      await createBooking({
        slotDate: selection.slotDate,
        slotTime: selection.slotTime,
        name,
        company: company as CompanyId,
        note,
      })
      resetForm()
      onClose()
    } catch {
      setError("That slot is already booked.")
    } finally {
      setIsPending(false)
    }
  }

  async function handleRemove() {
    if (!booking) {
      return
    }

    setIsPending(true)
    setError(null)

    try {
      await removeBooking({ id: booking.id })
      resetForm()
      onClose()
    } catch {
      setError("Could not remove booking.")
    } finally {
      setIsPending(false)
    }
  }

  const slotLabel =
    selection &&
    `${formatWeekday(new Date(`${selection.slotDate}T00:00:00`))}, ${formatDay(new Date(`${selection.slotDate}T00:00:00`))} · ${formatTimeSlot(selection.slotTime)}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{booking ? "Booking" : "Book slot"}</DialogTitle>
          <DialogDescription>{slotLabel}</DialogDescription>
        </DialogHeader>

        {booking ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">{booking.name}</span>
              <Badge variant="secondary">{getCompanyLabel(booking.company)}</Badge>
            </div>
            {booking.note ? (
              <p className="text-sm text-muted-foreground">{booking.note}</p>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleRemove}
              >
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                Remove
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleBook}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="company">Company</FieldLabel>
                <Select
                  value={company}
                  onValueChange={(value) => setCompany(value ?? "")}
                  required
                >
                  <SelectTrigger id="company" className="w-full">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {COMPANIES.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="note">Note</FieldLabel>
                <Textarea
                  id="note"
                  name="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  placeholder="Optional"
                />
              </Field>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </FieldGroup>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !company}>
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                Book
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
