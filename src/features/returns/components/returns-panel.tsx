import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Undo2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function ReturnsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, company, ledgerBySystemKey, isReady } = useWorkspace()
  const [mode, setMode] = React.useState<'sales' | 'purchase'>('sales')
  const [documentId, setDocumentId] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')
  const [returnDate, setReturnDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [message, setMessage] = React.useState<string | null>(null)

  const salesQuery = useQuery({
    ...trpc.sales.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const purchasesQuery = useQuery({
    ...trpc.purchases.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const postSalesReturn = useMutation(
    trpc.returns.postSalesReturn.mutationOptions(),
  )
  const postPurchaseReturn = useMutation(
    trpc.returns.postPurchaseReturn.mutationOptions(),
  )

  const selectedSales = (salesQuery.data ?? []).find(
    (row) => row.id === documentId,
  )
  const selectedPurchase = (purchasesQuery.data ?? []).find(
    (row) => row.id === documentId,
  )

  async function handleReturn(event: React.FormEvent) {
    event.preventDefault()
    if (!companyId || !company || !documentId) return
    setMessage(null)

    try {
      if (mode === 'sales') {
        if (!selectedSales?.lines[0]) {
          throw new Error('Select a sales invoice with lines')
        }
        const line = selectedSales.lines[0]
        const party = (partiesQuery.data ?? []).find(
          (entry) => entry.id === selectedSales.customerId,
        )
        const salesReturn = await postSalesReturn.mutateAsync({
          companyId,
          companyStateCode: company.stateCode,
          customerId: selectedSales.customerId,
          customerStateCode: party?.stateCode ?? company.stateCode,
          salesInvoiceId: selectedSales.id,
          returnDate,
          salesAccountId: ledgerBySystemKey.sales!,
          outputGstAccountId: ledgerBySystemKey.output_gst!,
          receivableAccountId: ledgerBySystemKey.customer_receivable!,
          lines: [
            {
              itemId: line.itemId,
              description: line.description,
              quantity,
              unit: line.unit,
              rate: line.rate,
              gstRate: line.gstRate,
            },
          ],
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listStockBalances.queryKey({ companyId }),
        })
        setMessage(
          `Credit note ${salesReturn.noteNumber} posted for ${selectedSales.invoiceNumber}`,
        )
      } else {
        if (!selectedPurchase?.lines[0]) {
          throw new Error('Select a purchase bill with lines')
        }
        const line = selectedPurchase.lines[0]
        const party = (partiesQuery.data ?? []).find(
          (entry) => entry.id === selectedPurchase.supplierId,
        )
        const purchaseReturn = await postPurchaseReturn.mutateAsync({
          companyId,
          companyStateCode: company.stateCode,
          supplierId: selectedPurchase.supplierId,
          supplierStateCode: party?.stateCode ?? '24',
          purchaseBillId: selectedPurchase.id,
          returnDate,
          purchaseAccountId: ledgerBySystemKey.purchase!,
          inputGstAccountId: ledgerBySystemKey.input_gst!,
          payableAccountId: ledgerBySystemKey.supplier_payable!,
          lines: [
            {
              itemId: line.itemId,
              description: line.description,
              quantity,
              unit: line.unit,
              rate: line.rate,
              gstRate: line.gstRate,
            },
          ],
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listStockBalances.queryKey({ companyId }),
        })
        setMessage(
          `Debit note ${purchaseReturn.noteNumber} posted for ${selectedPurchase.supplierBillNumber}`,
        )
      }
    } catch (err) {
      toastActionError(err, 'Return failed')
    }
  }

  return (
    <WorkspacePage
      description="Sales and purchase returns reverse stock and GST through the ledger engine."
      title="Returns"
    >
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Undo2Icon className="size-4 text-muted-foreground" />
              Return / note entry
            </CardTitle>
            <CardDescription>
              Returns first line of the selected document for a quick MVP flow
            </CardDescription>
          </div>
          <Tabs
            onValueChange={(value) => {
              setMode(value as 'sales' | 'purchase')
              setDocumentId('')
            }}
            value={mode}
          >
            <TabsList>
              <TabsTrigger value="sales">Sales return</TabsTrigger>
              <TabsTrigger value="purchase">Purchase return</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-xl gap-4" onSubmit={handleReturn}>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {mode === 'sales' ? 'Sales invoice' : 'Purchase bill'}
              </span>
              <Select onValueChange={setDocumentId} value={documentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {mode === 'sales'
                      ? (salesQuery.data ?? []).map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.invoiceNumber} · {formatInr(row.totalAmount)}
                          </SelectItem>
                        ))
                      : (purchasesQuery.data ?? []).map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.supplierBillNumber} ·{' '}
                            {formatInr(row.totalAmount)}
                          </SelectItem>
                        ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="ret-qty">
                  Return qty (first line)
                </label>
                <Input
                  id="ret-qty"
                  onChange={(event) => setQuantity(event.target.value)}
                  required
                  value={quantity}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="ret-date">
                  Return date
                </label>
                <Input
                  id="ret-date"
                  onChange={(event) => setReturnDate(event.target.value)}
                  required
                  type="date"
                  value={returnDate}
                />
              </div>
            </div>
            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : null}
            <Button
              disabled={
                postSalesReturn.isPending || postPurchaseReturn.isPending
              }
              type="submit"
            >
              Post return
            </Button>
          </form>
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
