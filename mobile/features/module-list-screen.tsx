import { useLocalSearchParams, useRouter } from 'expo-router'

import { ActionGrid } from '@/components/dashboard/action-grid'
import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { View } from '@/tw'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { getModuleById } from '@/lib/nav-config'
import { TAB_HUB_CONFIG } from '@/lib/tab-actions'
import { pageLayout } from '@/lib/spacing'
import { ReportsScreen } from '@/features/reports-screen'
import { PaymentsScreen } from '@/features/payments-screen'
import { BankReconciliationScreen } from '@/features/bank-reconciliation-screen'
import { CompanyProfileScreen } from '@/features/company-profile-screen'
import { JournalEntryScreen } from '@/features/journal-entry-screen'
import {
  ChartOfAccountsScreen,
  SettingsScreen,
} from '@/features/settings-screens'
import { useModuleList } from '@/features/use-module-list'

function pickTitle(record: Record<string, unknown>) {
  return (
    (record.invoiceNumber as string | undefined) ??
    (record.supplierBillNumber as string | undefined) ??
    (record.billNumber as string | undefined) ??
    (record.documentNumber as string | undefined) ??
    (record.orderNumber as string | undefined) ??
    (record.grnNumber as string | undefined) ??
    (record.noteNumber as string | undefined) ??
    (record.narration as string | undefined) ??
    (record.itemName as string | undefined) ??
    (record.name as string | undefined) ??
    (record.tradeName as string | undefined) ??
    (record.title as string | undefined) ??
    (record.sourceFilename as string | undefined) ??
    'Record'
  )
}

function pickSubtitle(record: Record<string, unknown>) {
  const date =
    (record.invoiceDate as string | undefined) ??
    (record.billDate as string | undefined) ??
    (record.orderDate as string | undefined) ??
    (record.grnDate as string | undefined) ??
    (record.noteDate as string | undefined) ??
    (record.expenseDate as string | undefined) ??
    (record.documentDate as string | undefined) ??
    (record.periodStart as string | undefined) ??
    (record.createdAt as string | undefined)
  return date ? formatShortDate(String(date).slice(0, 10)) : undefined
}

function pickAmount(record: Record<string, unknown>) {
  const amount =
    (record.totalAmount as string | undefined) ??
    (record.amount as string | undefined) ??
    (record.outstandingAmount as string | undefined) ??
    (record.quantity as string | undefined)
  if (amount === undefined) return undefined
  if (record.itemName && record.unit) {
    return `${amount} ${record.unit}`
  }
  return formatInr(amount)
}

function pickBadge(record: Record<string, unknown>) {
  const partyType = record.partyType as string | undefined
  if (partyType === 'customer') return 'Customer'
  if (partyType === 'supplier') return 'Supplier'
  if (partyType === 'both') return 'Both'

  const noteType = record.noteType as string | undefined
  if (noteType === 'credit') return 'Credit note'
  if (noteType === 'debit') return 'Debit note'

  return (
    (record.status as string | undefined) ??
    (record.paymentStatus as string | undefined) ??
    (record.documentType as string | undefined) ??
    (record.accountType as string | undefined) ??
    (record.isDefault === true ? 'Default' : undefined)
  )
}

function pickDetailPath(moduleId: string, record: Record<string, unknown>) {
  const id = record.id
  if (typeof id !== 'string' || id.length === 0) {
    return undefined
  }

  if (moduleId === 'sales') {
    return `/(app)/sales/${id}`
  }

  if (moduleId === 'purchases') {
    return `/(app)/purchases/${id}`
  }

  if (moduleId === 'parties') {
    return `/(app)/parties/${id}`
  }

  if (moduleId === 'items') {
    return `/(app)/items/${id}`
  }

  if (moduleId === 'ocr') {
    return `/(app)/purchases/ocr/${id}`
  }

  if (moduleId === 'sales-documents') {
    return `/(app)/sales-documents/${id}`
  }

  if (moduleId === 'purchase-orders') {
    return `/(app)/purchase-orders/${id}`
  }

  if (moduleId === 'purchase-grns') {
    return `/(app)/purchase-grns/${id}`
  }

  if (moduleId === 'expenses') {
    return `/(app)/expenses/${id}`
  }

  if (moduleId === 'godowns') {
    return `/(app)/godowns/${id}/edit`
  }

  if (moduleId === 'inventory') {
    const itemId = record.itemId
    if (typeof itemId === 'string' && itemId.length > 0) {
      return `/(app)/stock/${itemId}`
    }
  }

  return undefined
}

function ModuleRecordsList({
  moduleId,
  query,
}: {
  moduleId: string
  query: ReturnType<typeof useModuleList>
}) {
  const router = useRouter()

  return (
    <>
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <EmptyState message="Unable to load records. Check your connection and company access." />
      ) : null}
      {!query.isLoading && !query.isError && query.data?.length === 0 ? (
        <EmptyState message="No records yet." />
      ) : null}
      <View style={{ gap: pageLayout.sectionHeaderGap }}>
        {query.data?.map((record, index) => {
        const detailPath = pickDetailPath(moduleId, record)

        return (
          <CardRow
            key={String(record.id ?? index)}
            title={pickTitle(record)}
            subtitle={pickSubtitle(record)}
            amount={pickAmount(record)}
            badge={pickBadge(record)}
            onPress={
              detailPath
                ? () => router.push(detailPath as never)
                : undefined
            }
          />
        )
      })}
      </View>
    </>
  )
}

export function ModuleListScreen({
  moduleId,
  variant = 'tab',
}: {
  moduleId: string
  variant?: 'tab' | 'stack'
}) {
  const module = getModuleById(moduleId)
  const query = useModuleList(moduleId)
  const tabHub = TAB_HUB_CONFIG[moduleId]

  if (!module) {
    return (
      <Screen title="Module" variant={variant}>
        <EmptyState message="Unknown module." />
      </Screen>
    )
  }

  if (module.id === 'reports') {
    return <ReportsScreen variant={variant} />
  }

  if (module.id === 'payments') {
    return <PaymentsScreen variant={variant} />
  }

  if (module.id === 'imports') {
    return (
      <Screen title={module.title} variant={variant}>
        <EmptyState message="CSV import is available on web. Mobile upload support is planned." />
      </Screen>
    )
  }

  if (module.id === 'settings') {
    return <SettingsScreen />
  }

  if (module.id === 'company-profile') {
    return <CompanyProfileScreen />
  }

  if (module.id === 'bank-reconciliation') {
    return <BankReconciliationScreen />
  }

  if (module.id === 'journal') {
    return <JournalEntryScreen />
  }

  if (module.id === 'chart-of-accounts') {
    return <ChartOfAccountsScreen />
  }

  if (module.id === 'companies') {
    return (
      <Screen title={module.title} variant={variant}>
        <ModuleRecordsList moduleId={moduleId} query={query} />
      </Screen>
    )
  }

  if (tabHub) {
    return (
      <Screen
        title={module.title}
        variant={variant}
        actionHref={module.createPath}
        actionLabel={module.createPath ? 'Create' : undefined}
      >
        <View style={{ gap: pageLayout.sectionHeaderGap }}>
          <SectionHeader title="Quick links" compact icon="flash-outline" />
          <ActionGrid items={tabHub.actions} />
        </View>
        <View style={{ gap: pageLayout.sectionHeaderGap }}>
          <SectionHeader
            title={tabHub.listTitle}
            compact
            icon={tabHub.listIcon}
          />
          <ModuleRecordsList moduleId={moduleId} query={query} />
        </View>
      </Screen>
    )
  }

  return (
    <Screen
      title={module.title}
      variant={variant}
      actionHref={module.createPath}
      actionLabel={module.createPath ? 'Create' : undefined}
    >
      <ModuleRecordsList moduleId={moduleId} query={query} />
    </Screen>
  )
}

export default function DynamicModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ModuleListScreen moduleId={id} variant="stack" />
}
