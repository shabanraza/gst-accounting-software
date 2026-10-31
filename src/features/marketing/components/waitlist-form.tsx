import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { usePostHog } from '@posthog/react'
import { MailIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useSpamGuard } from '#/features/marketing/components/use-spam-guard.tsx'
import { WAITLIST } from '#/features/marketing/landing-content.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function WaitlistForm() {
  const trpc = useTRPC()
  const posthog = usePostHog()
  const guard = useSpamGuard()
  const subscribe = useMutation(trpc.marketing.subscribe.mutationOptions())
  const [email, setEmail] = React.useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await subscribe.mutateAsync({ email, ...guard.payload() })
      posthog.capture('waitlist_submitted')
      toast.success(WAITLIST.success)
      setEmail('')
      guard.reset()
    } catch (error) {
      toastActionError(error, 'Unable to subscribe right now.')
    }
  }

  return (
    <form
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <label className="sr-only" htmlFor="waitlist-email">
        {WAITLIST.label}
      </label>
      <Input
        autoComplete="email"
        className="h-9 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/60"
        id="waitlist-email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder={WAITLIST.placeholder}
        required
        type="email"
        value={email}
      />
      {guard.fields}
      <Button
        disabled={subscribe.isPending}
        size="lg"
        type="submit"
        variant="secondary"
      >
        <MailIcon data-icon="inline-start" />
        {subscribe.isPending ? 'Saving…' : WAITLIST.button}
      </Button>
    </form>
  )
}
