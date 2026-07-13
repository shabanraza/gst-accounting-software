import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, ScanTextIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function OcrReviewPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const {
    companyId,
    company,
    ledgerBySystemKey,
    isReady,
  } = useWorkspace()
  const [error, setError] = React.useState<string | null>(null)

  const draftsQuery = useQuery({
    ...trpc.ocr.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const confirmMutation = useMutation(trpc.ocr.confirm.mutationOptions())

  async function handleConfirm(draftId: string) {
    if (!companyId || !company) return
    setError(null)

    const purchaseAccountId = ledgerBySystemKey.purchase
    const inputGstAccountId = ledgerBySystemKey.input_gst
    const payableAccountId = ledgerBySystemKey.supplier_payable
    const stockAccountId = ledgerBySystemKey.stock_in_hand

    if (
      !purchaseAccountId ||
      !inputGstAccountId ||
      !payableAccountId ||
      !stockAccountId
    ) {
      setError('Ledger mappings required before posting OCR bills')
      return
    }

    try {
      await confirmMutation.mutateAsync({
        companyId,
        draftId,
        companyStateCode: company.stateCode,
        financialYearStart: company.financialYearStart,
        purchaseAccountId,
        inputGstAccountId,
        payableAccountId,
        stockAccountId,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.ocr.list.queryKey({ companyId }),
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.purchases.list.queryKey(),
      })
    } catch (err) {
      setError(getFormErrorMessage(err, 'Failed to confirm OCR draft'))
    }
  }

  const drafts = (draftsQuery.data ?? []).filter(
    (draft) => draft.status !== 'posted',
  )

  return (
    <WorkspacePage
      description="Review OCR-extracted purchase bills before posting."
      title="OCR review"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanTextIcon className="size-4 text-muted-foreground" />
            Draft purchase bills
          </CardTitle>
          <CardDescription>
            Confirm posts a purchase bill from extracted header fields
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Bill</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {draftsQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    Loading OCR drafts…
                  </TableCell>
                </TableRow>
              ) : drafts.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    No OCR drafts awaiting review.
                  </TableCell>
                </TableRow>
              ) : (
                drafts.map((draft) => (
                  <TableRow key={draft.id}>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {draft.fields.supplierName.value}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {draft.fields.supplierGstin.value || 'No GSTIN'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{draft.fields.billNumber.value}</TableCell>
                    <TableCell>{draft.fields.billDate.value}</TableCell>
                    <TableCell>
                      {formatInr(draft.fields.taxableAmount.value)}
                    </TableCell>
                    <TableCell>
                      {formatInr(draft.fields.gstAmount.value)}
                    </TableCell>
                    <TableCell>
                      {formatInr(draft.fields.totalAmount.value)}
                    </TableCell>
                    <TableCell>
                      {draft.lowConfidenceFields.length > 0 ? (
                        <Badge variant="warning">Low confidence</Badge>
                      ) : (
                        <Badge variant="outline">{draft.status}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        disabled={confirmMutation.isPending}
                        onClick={() => handleConfirm(draft.id)}
                        size="sm"
                        type="button"
                      >
                        <CheckIcon data-icon="inline-start" />
                        Confirm &amp; post
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {error ? (
            <p className="px-6 pt-4 text-sm text-destructive">{error}</p>
          ) : null}
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
