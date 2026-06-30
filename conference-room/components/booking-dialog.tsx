"use client"

import { useState } from "react"

import {
  COMPANIES,
  formatTimeRange,
} from "@/lib/constants"
import type { CompanyId, TimeSlot } from "@/lib/constants"
import type {
  CreateBookingInput,
  UpdateBookingDetailsInput,
} from "@/hooks/use-local-bookings"
import type { Booking } from "@/lib/types"
import { getBookingErrorMessage } from "@/lib/slot-validation"
import { formatDay, formatWeekday } from "@/lib/week"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
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
  slotCount: number
  booking?: Booking
}

type BookingDialogProps = {
  selection: SlotSelection | null
  onClose: () => void
  createBooking: (input: CreateBookingInput) => Promise<void>
  updateBookingDetails: (input: UpdateBookingDetailsInput) => Promise<void>
  removeBooking: (id: string) => Promise<void>
}

type BookingFormProps = {
  selection: SlotSelection
  createBooking: (input: CreateBookingInput) => Promise<void>
  updateBookingDetails: (input: UpdateBookingDetailsInput) => Promise<void>
  removeBooking: (id: string) => Promise<void>
  onClose: () => void
}

function BookingForm({
  selection,
  createBooking,
  updateBookingDetails,
  removeBooking,
  onClose,
}: BookingFormProps) {
  const booking = selection.booking
  const [name, setName] = useState(booking?.name ?? "")
  const [company, setCompany] = useState(booking?.company ?? "")
  const [note, setNote] = useState(booking?.note ?? "")
  const [nameError, setNameError] = useState<string | null>(null)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function validateForm() {
    let valid = true

    if (!name.trim()) {
      setNameError("Enter a name.")
      valid = false
    }

    if (!company) {
      setCompanyError("Select a company.")
      valid = false
    }

    return valid
  }

  async function handleBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsPending(true)
    setError(null)
    setNameError(null)
    setCompanyError(null)

    try {
      await createBooking({
        slotDate: selection.slotDate,
        slotTime: selection.slotTime,
        slotCount: selection.slotCount,
        name,
        company: company as CompanyId,
        note,
      })
      onClose()
    } catch (caught) {
      setError(getBookingErrorMessage(caught))
    } finally {
      setIsPending(false)
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!booking) {
      return
    }

    if (!validateForm()) {
      return
    }

    setIsPending(true)
    setError(null)
    setNameError(null)
    setCompanyError(null)

    try {
      await updateBookingDetails({
        id: booking.id,
        name,
        company: company as CompanyId,
        note,
      })
      onClose()
    } catch (caught) {
      setError(getBookingErrorMessage(caught))
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
      await removeBooking(booking.id)
      onClose()
    } catch (caught) {
      setError(getBookingErrorMessage(caught))
    } finally {
      setIsPending(false)
    }
  }

  const formFields = (
    <FieldGroup>
      <Field data-invalid={nameError ? true : undefined}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setNameError(null)
          }}
          autoComplete="name"
          aria-invalid={nameError ? true : undefined}
        />
        <FieldError>{nameError}</FieldError>
      </Field>
      <Field data-invalid={companyError ? true : undefined}>
        <FieldLabel htmlFor="company">Company</FieldLabel>
        <Select
          value={company}
          onValueChange={(value) => {
            setCompany(value ?? "")
            setCompanyError(null)
          }}
        >
          <SelectTrigger
            id="company"
            className="w-full"
            aria-invalid={companyError ? true : undefined}
          >
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
        <FieldError>{companyError}</FieldError>
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
  )

  if (booking) {
    return (
      <form onSubmit={handleSave}>
        {formFields}
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
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
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </DialogFooter>
      </form>
    )
  }

  return (
    <form onSubmit={handleBook}>
      {formFields}
      <DialogFooter className="mt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          Book
        </Button>
      </DialogFooter>
    </form>
  )
}

export function BookingDialog({
  selection,
  onClose,
  createBooking,
  updateBookingDetails,
  removeBooking,
}: BookingDialogProps) {
  const open = selection !== null

  const slotLabel =
    selection &&
    `${formatWeekday(new Date(`${selection.slotDate}T12:00:00Z`))}, ${formatDay(new Date(`${selection.slotDate}T12:00:00Z`))} · ${formatTimeRange(selection.slotTime, selection.slotCount)}`

  const formKey = selection
    ? (selection.booking?.id ??
      `${selection.slotDate}-${selection.slotTime}-${selection.slotCount}`)
    : "closed"

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{selection?.booking ? "Edit booking" : "Book slot"}</DialogTitle>
          <DialogDescription>{slotLabel}</DialogDescription>
        </DialogHeader>

        {selection ? (
          <BookingForm
            key={formKey}
            selection={selection}
            createBooking={createBooking}
            updateBookingDetails={updateBookingDetails}
            removeBooking={removeBooking}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
