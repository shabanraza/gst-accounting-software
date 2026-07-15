import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import {
  CardRow,
  EmptyState,
  LoadingState,
  Screen,
} from '@/components/screen'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import {
  salesInvoiceSummaryRows,
  salesInvoiceTotalsRows,
} from '@/lib/sales-invoice-detail'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Text className="text-sm font-medium text-gray-900">{value}</Text>
    </View>
  )
}

export function SalesInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { companyId } = useWorkspace()

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
          <View className="rounded-xl border border-gray-200 bg-white p-4">
            {salesInvoiceSummaryRows(invoice).map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </View>
          <View className="rounded-xl border border-gray-200 bg-white p-4">
            {salesInvoiceTotalsRows(invoice).map((row) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={formatInr(row.value)}
              />
            ))}
          </View>
          {invoice.lines.map((line, index) => (
            <CardRow
              key={`${line.description}-${index}`}
              title={line.description}
              subtitle={`${line.quantity} ${line.unit} × ${formatInr(line.rate)}`}
              amount={formatInr(line.lineAmount)}
              badge={`GST ${line.gstRate}%`}
            />
          ))}
        </>
      ) : null}
    </Screen>
  )
}
