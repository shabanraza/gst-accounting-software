import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { usePostHog } from '@posthog/react'
import { SendIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useSpamGuard } from '#/features/marketing/components/use-spam-guard.tsx'
import { CONTACT } from '#/features/marketing/landing-content.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

type ContactTopic = (typeof CONTACT.topics)[number]['value']

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  topic: 'other' as ContactTopic,
  message: '',
}

/**
 * Shared by the landing "Talk to us" section (`compact`: name, email,
 * message) and the full `/contact` page (adds phone and topic).
 */
export function ContactForm({ variant }: { variant: 'compact' | 'full' }) {
  const trpc = useTRPC()
  const posthog = usePostHog()
  const guard = useSpamGuard()
  const sendContact = useMutation(trpc.marketing.sendContact.mutationOptions())
  const [form, setForm] = React.useState(EMPTY_FORM)
  const idPrefix = `contact-${variant}`

  function update<TKey extends keyof typeof EMPTY_FORM>(
    key: TKey,
    value: (typeof EMPTY_FORM)[TKey],
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await sendContact.mutateAsync({ ...form, ...guard.payload() })
      posthog.capture('contact_submitted', { topic: form.topic, variant })
      toast.success(CONTACT.success)
      setForm(EMPTY_FORM)
      guard.reset()
    } catch (error) {
      toastActionError(error, 'Unable to send your message right now.')
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-name`}>Name</Label>
          <Input
            autoComplete="name"
            id={`${idPrefix}-name`}
            maxLength={100}
            onChange={(event) => update('name', event.target.value)}
            required
            value={form.name}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${idPrefix}-email`}>Email</Label>
          <Input
            autoComplete="email"
            id={`${idPrefix}-email`}
            onChange={(event) => update('email', event.target.value)}
            placeholder="you@business.com"
            required
            type="email"
            value={form.email}
          />
        </div>
        {variant === 'full' ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${idPrefix}-phone`}>Phone (optional)</Label>
              <Input
                autoComplete="tel"
                id={`${idPrefix}-phone`}
                inputMode="tel"
                maxLength={20}
                onChange={(event) => update('phone', event.target.value)}
                placeholder="+91 98765 43210"
                type="tel"
                value={form.phone}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${idPrefix}-topic`}>Topic</Label>
              <Select
                onValueChange={(value) => update('topic', value as ContactTopic)}
                value={form.topic}
              >
                <SelectTrigger className="w-full" id={`${idPrefix}-topic`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT.topics.map((topic) => (
                    <SelectItem key={topic.value} value={topic.value}>
                      {topic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-message`}>Message</Label>
        <Textarea
          id={`${idPrefix}-message`}
          maxLength={2000}
          minLength={10}
          onChange={(event) => update('message', event.target.value)}
          required
          rows={variant === 'full' ? 6 : 4}
          value={form.message}
        />
      </div>
      {guard.fields}
      <Button
        className="self-start"
        disabled={sendContact.isPending}
        type="submit"
      >
        <SendIcon data-icon="inline-start" />
        {sendContact.isPending ? 'Sending…' : CONTACT.button}
      </Button>
    </form>
  )
}
