import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { usePostHog } from '@posthog/react'
import { SendIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '#/components/ui/toggle-group.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useSpamGuard } from '#/features/marketing/components/use-spam-guard.tsx'
import { FEEDBACK } from '#/features/marketing/landing-content.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

const RATINGS = ['1', '2', '3', '4', '5'] as const

export function LandingFeedback() {
  const trpc = useTRPC()
  const posthog = usePostHog()
  const guard = useSpamGuard()
  const sendFeedback = useMutation(
    trpc.marketing.sendFeedback.mutationOptions(),
  )
  const [rating, setRating] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [email, setEmail] = React.useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!rating) {
      toast.error('Pick a rating from 1 to 5.')
      return
    }
    try {
      await sendFeedback.mutateAsync({
        rating: Number(rating),
        message,
        email,
        ...guard.payload(),
      })
      posthog.capture('feedback_submitted', { rating: Number(rating) })
      toast.success(FEEDBACK.success)
      setRating('')
      setMessage('')
      setEmail('')
      guard.reset()
    } catch (error) {
      toastActionError(error, 'Unable to send feedback right now.')
    }
  }

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-16 md:py-20"
      data-ui="chrome"
      id={FEEDBACK.id}
    >
      <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-start">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {FEEDBACK.title}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {FEEDBACK.subtitle}
          </p>
        </div>
        <Card>
          <CardContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => void handleSubmit(event)}
            >
              <div className="flex flex-col gap-2">
                <Label id="feedback-rating-label">{FEEDBACK.ratingLabel}</Label>
                <ToggleGroup
                  aria-labelledby="feedback-rating-label"
                  onValueChange={setRating}
                  type="single"
                  value={rating}
                  variant="outline"
                >
                  {RATINGS.map((value) => (
                    <ToggleGroupItem
                      key={value}
                      aria-label={`${value} out of 5`}
                      className="min-w-10"
                      value={value}
                    >
                      {value}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="feedback-message">{FEEDBACK.messageLabel}</Label>
                <Textarea
                  id="feedback-message"
                  maxLength={2000}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={FEEDBACK.messagePlaceholder}
                  required
                  rows={4}
                  value={message}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="feedback-email">{FEEDBACK.emailLabel}</Label>
                <Input
                  autoComplete="email"
                  id="feedback-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@business.com"
                  type="email"
                  value={email}
                />
              </div>
              {guard.fields}
              <Button
                className="self-start"
                disabled={sendFeedback.isPending}
                type="submit"
              >
                <SendIcon data-icon="inline-start" />
                {sendFeedback.isPending ? 'Sending…' : FEEDBACK.button}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
