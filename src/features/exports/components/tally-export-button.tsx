import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DownloadIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { ReturnPeriodFields } from '#/features/gst/components/return-period-fields.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { requireWorkspace } from '#/lib/form-validation.ts'
import {
  currentFinancialYearStart,
  currentGstMonthPeriod,
} from '#/lib/gst-period.ts'

function saveXmlFile(xml: string, fileName: string) {
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function TallyExportButton() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, company } = useWorkspace()
  const [periodStart, setPeriodStart] = React.useState(
    currentFinancialYearStart,
  )
  const [periodEnd, setPeriodEnd] = React.useState(
    () => currentGstMonthPeriod().periodEnd,
  )
  const [isDownloading, setIsDownloading] = React.useState(false)

  async function download() {
    if (!requireWorkspace(companyId) || !company) return
    if (periodStart > periodEnd) {
      toast.error('The period start is after the period end')
      return
    }
    setIsDownloading(true)
    try {
      const result = await queryClient.fetchQuery(
        trpc.reports.tallyExport.queryOptions({
          companyId,
          companyStateCode: company.stateCode,
          periodStart,
          periodEnd,
        }),
      )
      const suffix = `${periodStart}-to-${periodEnd}`
      saveXmlFile(result.masters, `tally-masters-${suffix}.xml`)
      saveXmlFile(result.vouchers, `tally-vouchers-${suffix}.xml`)
      toast.success(`Tally files ready with ${result.voucherCount} vouchers`)
    } catch (error) {
      toastActionError(error, 'Could not prepare the Tally files')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Tally export</CardTitle>
        <CardDescription>
          Ledgers, parties, stock items and vouchers as Tally XML
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
          <ReturnPeriodFields
            onPeriodEndChange={setPeriodEnd}
            onPeriodStartChange={setPeriodStart}
            periodEnd={periodEnd}
            periodStart={periodStart}
          />
        </div>
        <Button
          className="w-fit"
          disabled={isDownloading || !companyId}
          onClick={download}
        >
          <DownloadIcon data-icon="inline-start" />
          Download for Tally (XML)
        </Button>
      </CardContent>
    </Card>
  )
}
