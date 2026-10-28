import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useRouterState } from '@tanstack/react-router'
import { SendIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { FieldLabel } from '#/features/app-shell/components/field-label.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { APP_VERSION } from '#/features/changelog/releases.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function ReportProblemDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const trpc = useTRPC()
  const route = useRouterState({ select: (state) => state.location.pathname })
  const [description, setDescription] = React.useState('')
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent

  const report = useMutation({
    ...trpc.support.reportProblem.mutationOptions(),
    onSuccess: () => {
      toast.success('Thanks — your report was sent to support.')
      setDescription('')
      onOpenChange(false)
    },
    onError: (error) => toastActionError(error, 'Unable to send your report'),
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!description.trim()) return
    report.mutate({ description, route, appVersion: APP_VERSION, userAgent })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Report a problem</DialogTitle>
            <DialogDescription>
              Please don't include passwords or bank details.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <FieldLabel htmlFor="problem-description">
              What happened?
            </FieldLabel>
            <Textarea
              autoFocus
              id="problem-description"
              maxLength={4000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What you did, what you expected, and what happened instead"
              rows={6}
              value={description}
            />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <dt>Page</dt>
            <dd className="truncate">{route}</dd>
            <dt>App version</dt>
            <dd>{APP_VERSION}</dd>
            <dt>Browser</dt>
            <dd className="truncate">{userAgent}</dd>
          </dl>
          <DialogFooter>
            <Button
              disabled={!description.trim() || report.isPending}
              type="submit"
            >
              <SendIcon data-icon="inline-start" />
              {report.isPending ? 'Sending…' : 'Send report'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
