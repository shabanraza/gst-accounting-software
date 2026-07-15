import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { SectionHeader } from '@/components/section-header'
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/screen'
import { formatInr } from '@/lib/format-inr'
import {
  buildOcrConfirmInput,
  isOcrDraftConfirmable,
  ocrDraftSummaryRows,
  validateOcrConfirmLedgers,
} from '@/lib/ocr-confirm'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="shrink text-right text-sm font-medium text-foreground">
        {label === 'Taxable' || label === 'GST' || label === 'Total'
          ? formatInr(value)
          : value}
      </Text>
    </View>
  )
}

export function OcrDraftDetailScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { companyId, company, ledgerBySystemKey } = useWorkspace()
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const draftsQuery = useQuery({
    queryKey: ['ocr-draft', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async () => {
      const drafts = await trpcClient.ocr.list.query({
        companyId: companyId!,
      })
      const draft = drafts.find((entry) => entry.id === id)
      if (!draft) {
        throw new Error('OCR draft not found')
      }
      return draft
    },
  })

  const draft = draftsQuery.data

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !company || !draft) {
        throw new Error('Draft not loaded')
      }

      const ledgerError = validateOcrConfirmLedgers(ledgerBySystemKey)
      if (ledgerError) {
        throw new Error(ledgerError)
      }

      return trpcClient.ocr.confirm.mutate(
        buildOcrConfirmInput({
          companyId,
          draftId: draft.id,
          company,
          ledgerBySystemKey,
        }),
      )
    },
    onSuccess: async (result) => {
      setError(null)
      setMessage('Purchase bill posted from OCR draft.')
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'ocr'] })
      await queryClient.invalidateQueries({ queryKey: ['ocr-draft', companyId, id] })
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'purchases'] })
      if (result.postedPurchaseBillId) {
        router.replace(`/(app)/purchases/${result.postedPurchaseBillId}` as never)
      }
    },
    onError: (mutationError) => {
      setMessage(null)
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Failed to confirm OCR draft.',
      )
    },
  })

  if (draftsQuery.isLoading) {
    return (
      <Screen title="OCR draft">
        <LoadingState />
      </Screen>
    )
  }

  if (draftsQuery.isError || !draft) {
    return (
      <Screen title="OCR draft">
        <EmptyState message="OCR draft not found or unavailable." />
      </Screen>
    )
  }

  const confirmable = isOcrDraftConfirmable(draft)

  return (
    <Screen
      title={draft.fields.supplierName.value || 'OCR draft'}
      subtitle={draft.fields.billNumber.value || 'Review extracted fields'}
    >
      {draft.lowConfidenceFields.length > 0 ? (
        <View className="rounded-xl border border-warning/40 bg-warning/10 p-card-padding">
          <Text className="text-sm text-foreground">
            Low confidence fields: {draft.lowConfidenceFields.join(', ')}
          </Text>
        </View>
      ) : null}

      <View className="gap-section-header">
        <SectionHeader title="Extracted fields" compact icon="scan-outline" />
        <View className="rounded-xl border border-border bg-card p-card-padding">
          {ocrDraftSummaryRows(draft).map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </View>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Status" compact icon="flag-outline" />
        <View className="rounded-xl border border-border bg-card p-card-padding">
          <DetailRow label="Draft status" value={draft.status} />
        </View>
      </View>

      {message ? <Text className="text-sm text-primary">{message}</Text> : null}
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      {confirmable ? (
        <PrimaryButton
          label={confirmMutation.isPending ? 'Posting…' : 'Confirm & post bill'}
          loading={confirmMutation.isPending}
          disabled={confirmMutation.isPending}
          onPress={() => confirmMutation.mutate()}
        />
      ) : (
        <Text className="text-sm text-muted-foreground">
          This draft has already been posted.
        </Text>
      )}

      <SecondaryButton label="Back" onPress={() => router.back()} />
    </Screen>
  )
}
