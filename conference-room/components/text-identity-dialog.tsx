"use client"

import { useState } from "react"

import { COMPANIES, type CompanyId } from "@/lib/constants"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TextIdentityDialogProps = {
  open: boolean
  onContinue: (identity: { name: string; company: CompanyId }) => void
}

export function TextIdentityDialog({
  open,
  onContinue,
}: TextIdentityDialogProps) {
  const [name, setName] = useState("")
  const [company, setCompany] = useState<CompanyId>("nilo")

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Join the document</DialogTitle>
          <DialogDescription>
            Choose how your edits appear to everyone else. This is saved in your
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
              placeholder="Gabriel"
              autoFocus
            />
          </Field>
          <Field>
            <FieldLabel>Company</FieldLabel>
            <Select
              value={company}
              onValueChange={(value) => setCompany(value as CompanyId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {COMPANIES.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              const trimmedName = name.trim()
              storeTextIdentity({ name: trimmedName, company })
              onContinue({ name: trimmedName, company })
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
