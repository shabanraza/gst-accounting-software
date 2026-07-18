import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { CardRow } from '@/components/data/card-row'
import { DetailCard } from '@/components/data/detail-card'
import { DetailRow } from '@/components/data/detail-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton } from '@/components/ui/button'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { computeLineAmount } from '@/lib/document-lines'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

const documentTypeLabels = {
  quotation: 'Quotation',
  sales_order: 'Sales order',
  delivery_challan: 'Delivery challan',
} as const

export function SalesDocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { companyId } = useWorkspace()

  const documentQuery = useQuery({
    queryKey: ['sales-document', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: () =>
      trpcClient.salesDocuments.getById.query({
        companyId: companyId!,
        documentId: id!,
      }),
  })

  const document = documentQuery.data

  if (documentQuery.isLoading) {
    return (
      <Screen title="Sales document">
        <LoadingState />
      </Screen>
    )
  }

  if (!document) {
    return (
      <Screen title="Sales document">
        <EmptyState message="Document not found or unavailable." />
      </Screen>
    )
  }

  return (
    <Screen
      title={document.documentNumber}
      subtitle={documentTypeLabels[document.documentType]}
    >
      <DetailCard title="Summary" icon="information-circle-outline">
        <DetailRow label="Date" value={formatShortDate(document.documentDate)} />
        <DetailRow label="Status" value={document.status} />
        {document.narration ? (
          <DetailRow label="Note" value={document.narration} />
        ) : null}
      </DetailCard>

      <DetailCard title="Totals" icon="calculator-outline">
        <DetailRow label="Items" value={String(document.lines.length)} />
        <DetailRow label="Total" value={formatInr(document.totalAmount)} />
      </DetailCard>

      <View className="gap-section-header">
        <SectionHeader title="Line items" compact icon="list-outline" />
        {document.lines.map((line, index) => {
          const lineAmount = computeLineAmount(line.quantity, line.rate)

          return (
            <CardRow
              key={`${line.itemId}-${index}`}
              title={line.description}
              subtitle={`${line.quantity} ${line.unit} × ${formatInr(line.rate)}`}
              amount={lineAmount ? formatInr(lineAmount) : undefined}
            />
          )
        })}
      </View>

      {document.status === 'open' ? (
        <PrimaryButton
          label="Convert to invoice"
          onPress={() =>
            router.push({
              pathname: '/(app)/sales/new',
              params: { fromDocument: document.id },
            } as never)
          }
        />
      ) : null}
    </Screen>
  )
}
