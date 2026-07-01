"use client"

import { useEffect, useMemo, useState } from "react"

import { COMPANIES, formatTimeRange } from "@/lib/constants"
import type { CompanyId, TimeSlot } from "@/lib/constants"
import type {
  CreateBookingInput,
  CreateRecurringInput,
  CreateRecurringResult,
  PreviewRecurringInput,
  UpdateBookingDetailsInput,
} from "@/hooks/use-local-bookings"
import type { Booking } from "@/lib/types"
import type {
  RecurrenceEnd,
  RecurrenceInterval,
  RecurrencePreview,
} from "@/lib/recurrence"
import { getBookingErrorMessage } from "@/lib/slot-validation"
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

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
  previewRecurring: (input: PreviewRecurringInput) => Promise<RecurrencePreview>
  createRecurring: (
    input: CreateRecurringInput
  ) => Promise<CreateRecurringResult>
  updateBookingDetails: (input: UpdateBookingDetailsInput) => Promise<void>
  removeBooking: (id: string) => Promise<void>
}

type BookingFormProps = {
  selection: SlotSelection
  createBooking: (input: CreateBookingInput) => Promise<void>
  previewRecurring: (input: PreviewRecurringInput) => Promise<RecurrencePreview>
  createRecurring: (
    input: CreateRecurringInput
  ) => Promise<CreateRecurringResult>
  updateBookingDetails: (input: UpdateBookingDetailsInput) => Promise<void>
  removeBooking: (id: string) => Promise<void>
  onClose: () => void
}

const RECURRENCE_INTERVALS: Array<{
  value: RecurrenceInterval
  label: string
  description: string
}> = [
  { value: "none", label: "No repeat", description: "Only this booking" },
  { value: "weekly", label: "Weekly", description: "Same time each week" },
  {
    value: "biweekly",
    label: "Every 2 weeks",
    description: "Alternate weeks",
  },
]

const RECURRENCE_ENDS: Array<{ value: RecurrenceEnd; label: string }> = [
  { value: "1month", label: "Next month" },
  { value: "3months", label: "Next 3 months" },
  { value: "6months", label: "Next 6 months" },
  { value: "1year", label: "Next year" },
  { value: "52weeks", label: "Ongoing (52 weeks)" },
]

function getIntervalWeeks(interval: RecurrenceInterval): 1 | 2 | null {
  if (interval === "weekly") {
    return 1
  }

  if (interval === "biweekly") {
    return 2
  }

  return null
}

function getRecurrenceEndLabel(value: RecurrenceEnd) {
  return RECURRENCE_ENDS.find((item) => item.value === value)?.label ?? value
}

function formatSlotDate(slotDate: string) {
  const date = new Date(`${slotDate}T12:00:00Z`)
  return `${formatWeekday(date)}, ${formatDay(date)}`
}

function BookingForm({
  selection,
  createBooking,
  previewRecurring,
  createRecurring,
  updateBookingDetails,
  removeBooking,
  onClose,
}: BookingFormProps) {
  const booking = selection.booking
  const [name, setName] = useState(booking?.name ?? "")
  const [company, setCompany] = useState(booking?.company ?? "")
  const [note, setNote] = useState(booking?.note ?? "")
  const [recurrenceInterval, setRecurrenceInterval] =
    useState<RecurrenceInterval>("none")
  const [recurrenceEnd, setRecurrenceEnd] = useState<RecurrenceEnd>("1month")
  const [recurrencePreview, setRecurrencePreview] =
    useState<RecurrencePreview | null>(null)
  const [recurrencePreviewError, setRecurrencePreviewError] = useState<
    string | null
  >(null)
  const [confirmConflicts, setConfirmConflicts] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const intervalWeeks = getIntervalWeeks(recurrenceInterval)
  const recurringInput = useMemo<PreviewRecurringInput | null>(() => {
    if (!intervalWeeks || booking) {
      return null
    }

    return {
      slotDate: selection.slotDate,
      slotTime: selection.slotTime,
      slotCount: selection.slotCount,
      intervalWeeks,
      end: recurrenceEnd,
    }
  }, [booking, intervalWeeks, recurrenceEnd, selection])
  const unavailableCount = recurrencePreview
    ? recurrencePreview.summary.conflict + recurrencePreview.summary.past
    : 0
  const isPreviewPending =
    recurringInput !== null &&
    recurrencePreview === null &&
    recurrencePreviewError === null

  useEffect(() => {
    if (!recurringInput) {
      return
    }

    let cancelled = false

    void previewRecurring(recurringInput)
      .then((preview) => {
        if (!cancelled) {
          setRecurrencePreview(preview)
          setRecurrencePreviewError(null)
          setConfirmConflicts(false)
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setRecurrencePreview(null)
          setRecurrencePreviewError(getBookingErrorMessage(caught))
        }
      })

    return () => {
      cancelled = true
    }
  }, [previewRecurring, recurringInput])

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

    if (recurringInput) {
      if (!recurrencePreview) {
        setError(
          recurrencePreviewError ??
            "Recurring booking preview is still loading."
        )
        return
      }

      if (recurrencePreview.summary.available === 0) {
        setError("No dates are available for that recurring booking.")
        return
      }

      if (unavailableCount > 0) {
        setConfirmConflicts(true)
        return
      }

      await submitRecurringBooking(false)
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

  async function submitRecurringBooking(skipConflicts: boolean) {
    if (!recurringInput) {
      return
    }

    setIsPending(true)
    setError(null)
    setNameError(null)
    setCompanyError(null)

    try {
      await createRecurring({
        ...recurringInput,
        name,
        company: company as CompanyId,
        note,
        skipConflicts,
      })
      onClose()
    } catch (caught) {
      setError(getBookingErrorMessage(caught))
      setConfirmConflicts(false)
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
      {!booking ? (
        <>
          <Field>
            <FieldLabel htmlFor="recurrence">Repeats</FieldLabel>
            <ToggleGroup
              value={[recurrenceInterval]}
              onValueChange={(value) => {
                const nextValue = value[0] as RecurrenceInterval | undefined

                if (!nextValue) {
                  return
                }

                setRecurrenceInterval(nextValue)
                setRecurrencePreview(null)
                setRecurrencePreviewError(null)
                setError(null)
                setConfirmConflicts(false)
              }}
              variant="outline"
              spacing={2}
              className="grid w-full grid-cols-3 items-stretch"
            >
              {RECURRENCE_INTERVALS.map((item) => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  aria-label={item.label}
                  className="h-auto min-h-16 flex-col items-start justify-center gap-1 rounded-xl px-3 py-2 text-left whitespace-normal"
                >
                  <span>{item.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {item.description}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <FieldDescription>
              Make this reservation repeat from the selected date and time.
            </FieldDescription>
          </Field>
          {recurrenceInterval !== "none" ? (
            <>
              <Field className="rounded-xl border border-primary/40 bg-primary/10 p-3 ring-1 ring-primary/20">
                <FieldLabel
                  htmlFor="recurrence-end"
                  className="flex items-center gap-2 text-primary"
                >
                  Ends
                  <Badge>Review</Badge>
                </FieldLabel>
                <Select
                  value={recurrenceEnd}
                  onValueChange={(value) => {
                    setRecurrenceEnd(value as RecurrenceEnd)
                    setRecurrencePreview(null)
                    setRecurrencePreviewError(null)
                    setError(null)
                    setConfirmConflicts(false)
                  }}
                >
                  <SelectTrigger
                    id="recurrence-end"
                    className="w-full border-primary/50 bg-background ring-1 ring-primary/15"
                  >
                    <SelectValue>
                      {getRecurrenceEndLabel(recurrenceEnd)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {RECURRENCE_ENDS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldDescription className="text-primary/80">
                  Choose how far ahead to create this repeating reservation.
                </FieldDescription>
              </Field>
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                {isPreviewPending ? (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Spinner data-icon="inline-start" />
                    Checking recurring dates...
                  </p>
                ) : recurrencePreview ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground">
                      Repeats on{" "}
                      {formatWeekday(
                        new Date(`${selection.slotDate}T12:00:00Z`)
                      )}{" "}
                      · {recurrencePreview.summary.total} dates ·{" "}
                      {recurrencePreview.summary.available} available
                      {unavailableCount > 0
                        ? ` · ${unavailableCount} unavailable`
                        : ""}
                    </p>
                    {unavailableCount > 0 ? (
                      <div className="max-h-24 overflow-y-auto rounded-md border bg-background/60 p-2 text-xs text-muted-foreground">
                        {recurrencePreview.occurrences
                          .filter(
                            (occurrence) => occurrence.status !== "available"
                          )
                          .map((occurrence) => (
                            <div
                              key={occurrence.slotDate}
                              className="flex justify-between gap-3"
                            >
                              <span>{formatSlotDate(occurrence.slotDate)}</span>
                              <span>
                                {occurrence.status === "past"
                                  ? "Past"
                                  : "Booked"}
                              </span>
                            </div>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : recurrencePreviewError ? (
                  <p className="text-destructive">{recurrencePreviewError}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Choose an end date to preview recurring availability.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </>
      ) : null}
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
        {confirmConflicts && recurringInput && recurrencePreview ? (
          <>
            <p className="mr-auto text-left text-sm text-muted-foreground">
              {unavailableCount}{" "}
              {unavailableCount === 1 ? "date is" : "dates are"} unavailable.
              Book the other {recurrencePreview.summary.available}?
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setConfirmConflicts(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => void submitRecurringBooking(true)}
            >
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              Book {recurrencePreview.summary.available} dates
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                isPreviewPending ||
                (recurringInput !== null &&
                  (!recurrencePreview ||
                    recurrencePreview.summary.available === 0))
              }
            >
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              Book
            </Button>
          </>
        )}
      </DialogFooter>
    </form>
  )
}

export function BookingDialog({
  selection,
  onClose,
  createBooking,
  previewRecurring,
  createRecurring,
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
          <DialogTitle>
            {selection?.booking ? "Edit booking" : "Book slot"}
          </DialogTitle>
          <DialogDescription>{slotLabel}</DialogDescription>
        </DialogHeader>

        {selection ? (
          <BookingForm
            key={formKey}
            selection={selection}
            createBooking={createBooking}
            previewRecurring={previewRecurring}
            createRecurring={createRecurring}
            updateBookingDetails={updateBookingDetails}
            removeBooking={removeBooking}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
