import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import { CardRow } from '@/components/data/card-row'
import { DetailCard } from '@/components/data/detail-card'
import { DetailRow } from '@/components/data/detail-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { validatePaymentAmount, hasOutstandingBalance } from '@/lib/payment-allocation'
import {
  salesInvoiceSummaryRows,
  salesInvoiceTotalsRows,
} from '@/lib/sales-invoice-detail'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function SalesInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey } = useWorkspace()
  const [amount, setAmount] = React.useState('')
  const [receiptError, setReceiptError] = React.useState<string | null>(null)
  const [receiptMessage, setReceiptMessage] = React.useState<string | null>(null)

  const invoiceQuery = useQuery({
    queryKey: ['sales-invoice', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: () =>
      trpcClient.sales.getById.query({
        companyId: companyId!,
        id: id!,
      }),
  })

  const invoice = invoiceQuery.data

  React.useEffect(() => {
    if (invoice?.outstandingAmount && !amount) {
      setAmount(invoice.outstandingAmount)
    }
  }, [amount, invoice?.outstandingAmount])

  const receiptMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !invoice) {
        throw new Error('Invoice not loaded')
      }

      const validationError = validatePaymentAmount(
        amount,
        invoice.outstandingAmount,
      )
      if (validationError) {
        throw new Error(validationError)
      }

      if (!ledgerBySystemKey.cash || !ledgerBySystemKey.customer_receivable) {
        throw new Error('Cash or receivable ledger mapping is missing.')
      }

      return trpcClient.payments.allocateCustomerReceipt.mutate({
        companyId,
        invoiceId: invoice.id,
        amount,
        receiptDate: new Date().toISOString().slice(0, 10),
        cashAccountId: ledgerBySystemKey.cash,
        receivableAccountId: ledgerBySystemKey.customer_receivable,
      })
    },
    onSuccess: async () => {
      setReceiptError(null)
      setReceiptMessage('Receipt posted.')
      await queryClient.invalidateQueries({
        queryKey: ['sales-invoice', companyId, id],
      })
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'sales'] })
    },
    onError: (error) => {
      setReceiptMessage(null)
      setReceiptError(
        error instanceof Error ? error.message : 'Receipt failed.',
      )
    },
  })

  return (
    <Screen
      title={invoice?.invoiceNumber ?? 'Invoice'}
      subtitle={
        invoice?.invoiceDate
          ? formatShortDate(invoice.invoiceDate.slice(0, 10))
          : 'Sales invoice'
      }
    >
      {invoiceQuery.isLoading ? <LoadingState /> : null}
      {invoiceQuery.isError ? (
        <EmptyState message="Unable to load this invoice." />
      ) : null}
      {invoice ? (
        <>
          <DetailCard title="Summary" icon="information-circle-outline">
            {salesInvoiceSummaryRows(invoice).map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </DetailCard>
          <DetailCard title="Totals" icon="calculator-outline">
            {salesInvoiceTotalsRows(invoice).map((row) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={formatInr(row.value)}
              />
            ))}
          </DetailCard>
          <View className="gap-section-header">
            <SectionHeader title="Line items" compact icon="list-outline" />
            {invoice.lines.map((line, index) => (
              <CardRow
                key={`${line.description}-${index}`}
                title={line.description}
                subtitle={`${line.quantity} ${line.unit} × ${formatInr(line.rate)}`}
                amount={formatInr(line.lineAmount)}
                badge={`GST ${line.gstRate}%`}
              />
            ))}
          </View>
          {hasOutstandingBalance(invoice.outstandingAmount) ? (
            <View className="gap-section-header">
              <SectionHeader title="Record receipt" compact icon="cash-outline" />
              <View className="gap-3 rounded-xl border border-border bg-card p-card-padding">
                <Text className="text-sm text-muted-foreground">
                  Outstanding {formatInr(invoice.outstandingAmount)}
                </Text>
                <FormField
                  keyboardType="decimal-pad"
                  placeholder="Amount"
                  value={amount}
                  onChangeText={setAmount}
                />
                {receiptError ? (
                  <Text className="text-sm text-destructive">{receiptError}</Text>
                ) : null}
                {receiptMessage ? (
                  <Text className="text-sm text-muted-foreground">
                    {receiptMessage}
                  </Text>
                ) : null}
                <PrimaryButton
                  label={receiptMutation.isPending ? 'Posting…' : 'Post receipt'}
                  loading={receiptMutation.isPending}
                  disabled={receiptMutation.isPending}
                  onPress={() => receiptMutation.mutate()}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}
