import { useLocalSearchParams, useRouter } from 'expo-router'

import {
  CardRow,
  EmptyState,
  LoadingState,
  Screen,
} from '@/components/screen'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { getModuleById } from '@/lib/nav-config'
import { useModuleList } from '@/features/use-module-list'

function pickTitle(record: Record<string, unknown>) {
  return (
    (record.invoiceNumber as string | undefined) ??
    (record.billNumber as string | undefined) ??
    (record.documentNumber as string | undefined) ??
    (record.name as string | undefined) ??
    (record.tradeName as string | undefined) ??
    (record.title as string | undefined) ??
    'Record'
  )
}

function pickSubtitle(record: Record<string, unknown>) {
  const date =
    (record.invoiceDate as string | undefined) ??
    (record.billDate as string | undefined) ??
    (record.createdAt as string | undefined)
  return date ? formatShortDate(String(date).slice(0, 10)) : undefined
}

function pickAmount(record: Record<string, unknown>) {
  const amount =
    (record.totalAmount as string | undefined) ??
    (record.amount as string | undefined) ??
    (record.outstandingAmount as string | undefined)
  return amount ? formatInr(amount) : undefined
}

function pickBadge(record: Record<string, unknown>) {
  return (
    (record.status as string | undefined) ??
    (record.paymentStatus as string | undefined) ??
    (record.documentType as string | undefined)
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

  return undefined
}

export function ModuleListScreen({ moduleId }: { moduleId: string }) {
  const router = useRouter()
  const module = getModuleById(moduleId)
  const query = useModuleList(moduleId)

  if (!module) {
    return (
      <Screen title="Module">
        <EmptyState message="Unknown module." />
      </Screen>
    )
  }

  if (module.id === 'reports') {
    return (
      <Screen title={module.title} subtitle="GST and books">
        <CardRow title="GSTR-1" subtitle="Outward supplies" badge="Report" />
        <CardRow title="GSTR-3B" subtitle="Monthly summary" badge="Report" />
        <CardRow title="Trial balance" subtitle="Ledger balances" badge="Report" />
        <CardRow title="Receivables ageing" subtitle="Outstanding customers" badge="Report" />
      </Screen>
    )
  }

  if (module.id === 'payments') {
    return (
      <Screen title={module.title} subtitle="Receipts and supplier payments">
        <EmptyState message="Record customer receipts and supplier payments from invoice or bill detail screens." />
      </Screen>
    )
  }

  if (module.id === 'imports') {
    return (
      <Screen title={module.title}>
        <EmptyState message="CSV import is available on web. Mobile upload support is planned." />
      </Screen>
    )
  }

  if (module.id === 'settings') {
    return (
      <Screen title={module.title}>
        <CardRow title="Team members" subtitle="Manage users on web settings" />
        <CardRow title="Sign out" subtitle="Use the app menu to sign out" />
      </Screen>
    )
  }

  if (module.id === 'company-profile') {
    return (
      <Screen title={module.title}>
        <EmptyState message="Edit company profile on web for now. Mobile editing is coming next." />
      </Screen>
    )
  }

  return (
    <Screen
      title={module.title}
      actionHref={module.createPath}
      actionLabel={module.createPath ? 'Create' : undefined}
    >
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? (
        <EmptyState message="Unable to load records. Check your connection and company access." />
      ) : null}
      {!query.isLoading && !query.isError && query.data?.length === 0 ? (
        <EmptyState message="No records yet." />
      ) : null}
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
    </Screen>
  )
}

export default function DynamicModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ModuleListScreen moduleId={id} />
}
