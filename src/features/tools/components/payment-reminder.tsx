import * as React from 'react'
import { CopyIcon, MessageCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group.tsx'
import { Field } from '#/features/tools/components/tool-fields.tsx'
import {
  buildReminderMessage,
  buildWhatsAppLink,
} from '#/features/tools/payment-reminder-service.ts'
import type {
  ReminderLanguage,
  ReminderTone,
} from '#/features/tools/payment-reminder-service.ts'

export function PaymentReminder() {
  const id = React.useId()
  const [customerName, setCustomerName] = React.useState('')
  const [phone, setPhone] = React.useState('')
  const [businessName, setBusinessName] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [upiId, setUpiId] = React.useState('')
  const [language, setLanguage] = React.useState<ReminderLanguage>('en')
  const [tone, setTone] = React.useState<ReminderTone>('gentle')

  const message = buildReminderMessage({
    customerName,
    businessName,
    amount,
    dueDate,
    upiId,
    language,
    tone,
  })

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message)
      toast.success('Message copied')
    } catch {
      toast.error('Could not copy — select the text and copy it instead')
    }
  }

  return (
    <Card data-ui="data">
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${id}-customer`} label="Customer name">
            <Input id={`${id}-customer`} onChange={(event) => setCustomerName(event.target.value)} value={customerName} />
          </Field>
          <Field id={`${id}-phone`} label="WhatsApp number (optional)">
            <Input
              id={`${id}-phone`}
              inputMode="tel"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="98765 43210"
              value={phone}
            />
          </Field>
          <Field id={`${id}-amount`} label="Amount due (₹)">
            <Input
              className="font-mono"
              id={`${id}-amount`}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              value={amount}
            />
          </Field>
          <Field id={`${id}-due`} label="Due date (optional)">
            <Input id={`${id}-due`} onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
          </Field>
          <Field id={`${id}-business`} label="Your business name">
            <Input id={`${id}-business`} onChange={(event) => setBusinessName(event.target.value)} value={businessName} />
          </Field>
          <Field id={`${id}-upi`} label="Your UPI ID (optional)">
            <Input
              id={`${id}-upi`}
              onChange={(event) => setUpiId(event.target.value)}
              placeholder="name@bank"
              spellCheck={false}
              value={upiId}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Label id={`${id}-language-label`}>Language</Label>
            <ToggleGroup
              aria-labelledby={`${id}-language-label`}
              onValueChange={(value) => value && setLanguage(value as ReminderLanguage)}
              type="single"
              value={language}
              variant="outline"
            >
              <ToggleGroupItem value="en">English</ToggleGroupItem>
              <ToggleGroupItem value="hi">हिंदी</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-2">
            <Label id={`${id}-tone-label`}>Tone</Label>
            <ToggleGroup
              aria-labelledby={`${id}-tone-label`}
              onValueChange={(value) => value && setTone(value as ReminderTone)}
              type="single"
              value={tone}
              variant="outline"
            >
              <ToggleGroupItem value="gentle">Gentle</ToggleGroupItem>
              <ToggleGroupItem value="firm">Overdue</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Label htmlFor={`${id}-message`}>Message</Label>
          <Textarea className="min-h-48 text-sm" id={`${id}-message`} readOnly value={message} />
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={buildWhatsAppLink(message, phone)} rel="noreferrer" target="_blank">
                <MessageCircleIcon data-icon="inline-start" />
                Open in WhatsApp
              </a>
            </Button>
            <Button onClick={() => void copyMessage()} type="button" variant="outline">
              <CopyIcon data-icon="inline-start" />
              Copy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
