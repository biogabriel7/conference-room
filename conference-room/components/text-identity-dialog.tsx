"use client"

import { useState } from "react"

import type { CompanyId } from "@/lib/constants"
import { storeTextIdentity } from "@/lib/text-session"
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

const DEFAULT_COMPANY: CompanyId = "volantis"

type TextIdentityDialogProps = {
  open: boolean
  onContinue: (identity: { name: string; company: CompanyId }) => void
}

export function TextIdentityDialog({
  open,
  onContinue,
}: TextIdentityDialogProps) {
  const [name, setName] = useState("")

  const submit = () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return
    }

    storeTextIdentity({ name: trimmedName, company: DEFAULT_COMPANY })
    onContinue({ name: trimmedName, company: DEFAULT_COMPANY })
  }

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Join the report</DialogTitle>
          <DialogDescription>
            Your name labels the passages you write. This is saved in your
            browser.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="text-name">Your name</FieldLabel>
            <Input
              id="text-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  submit()
                }
              }}
              placeholder="e.g. Ana Pérez"
              autoFocus
            />
          </Field>
        </FieldGroup>

        <DialogFooter className="mt-6">
          <Button type="button" disabled={!name.trim()} onClick={submit}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
