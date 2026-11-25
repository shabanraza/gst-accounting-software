import * as React from 'react'
import { MessageSquareWarningIcon, RotateCwIcon, TriangleAlertIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty.tsx'
import { ReportProblemDialog } from '#/features/support/components/report-problem-dialog.tsx'

/**
 * What a page shows instead of a blank screen or raw error text when it
 * cannot load: the error, a retry, and (for signed-in users) a report that
 * carries the error to support.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  canReport,
}: {
  title: string
  message?: string
  onRetry: () => void
  canReport: boolean
}) {
  const [reportOpen, setReportOpen] = React.useState(false)

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <Empty className="py-10 sm:py-16" data-hero-surface="" data-ui="chrome">
        <EmptyHeader>
          <EmptyMedia
            className="icon-duotone size-12 rounded-full text-destructive"
            variant="icon"
          >
            <TriangleAlertIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">{title}</EmptyTitle>
          {message ? (
            <EmptyDescription className="break-words font-mono text-xs">
              {message}
            </EmptyDescription>
          ) : null}
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          <Button onClick={onRetry} type="button">
            <RotateCwIcon data-icon="inline-start" />
            Try again
          </Button>
          {canReport ? (
            <Button
              onClick={() => setReportOpen(true)}
              type="button"
              variant="outline"
            >
              <MessageSquareWarningIcon data-icon="inline-start" />
              Report a problem
            </Button>
          ) : null}
        </EmptyContent>
      </Empty>
      {canReport ? (
        <ReportProblemDialog onOpenChange={setReportOpen} open={reportOpen} />
      ) : null}
    </div>
  )
}
