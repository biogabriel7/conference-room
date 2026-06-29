"use client"

import { useState, useTransition } from "react"

import { bookSlot, removeBooking } from "@/lib/actions"
import { COMPANIES, formatTimeSlot, getCompanyLabel } from "@/lib/constants"
import type { TimeSlot } from "@/lib/constants"
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
  const [isPending, startTransition] = useTransition()

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

  function handleBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selection) {
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.set("slotDate", selection.slotDate)
      formData.set("slotTime", selection.slotTime)
      formData.set("name", name)
      formData.set("company", company)
      formData.set("note", note)

      const result = await bookSlot(formData)
      if (result.error) {
        setError(result.error)
        return
      }

      resetForm()
      onClose()
    })
  }

  function handleRemove() {
    if (!booking) {
      return
    }

    startTransition(async () => {
      const result = await removeBooking(booking.id)
      if (result.error) {
        setError(result.error)
        return
      }

      resetForm()
      onClose()
    })
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
