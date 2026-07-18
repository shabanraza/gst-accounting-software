import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { DetailCard } from '@/components/data/detail-card'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SaveScreenFooter } from '@/components/layout/create-screen-footer'
import { WizardFooter } from '@/components/layout/wizard-footer'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { SecondaryButton } from '@/components/ui/button'
import { DateField } from '@/components/ui/date-field'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import { formatInr } from '@/lib/format-inr'
import {
  withEditedOcrField,
  type OcrFieldsDraft,
} from '@/lib/ocr-fields'
import {
  buildOcrConfirmInput,
  buildOcrUpdateDraftInput,
  computeLowConfidenceFields,
  isOcrDraftConfirmable,
  validateOcrConfirmLedgers,
  validateOcrDraftFields,
} from '@/lib/ocr-confirm'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function fieldsFromDraft(fields: OcrFieldsDraft): OcrFieldsDraft {
  return {
    supplierName: { ...fields.supplierName },
    supplierGstin: { ...fields.supplierGstin },
    billNumber: { ...fields.billNumber },
    billDate: { ...fields.billDate },
    taxableAmount: { ...fields.taxableAmount },
    gstAmount: { ...fields.gstAmount },
    totalAmount: { ...fields.totalAmount },
  }
}

export function OcrDraftDetailScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { companyId, company, ledgerBySystemKey } = useWorkspace()
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [fields, setFields] = React.useState<OcrFieldsDraft | null>(null)

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

  React.useEffect(() => {
    if (draft) {
      setFields(fieldsFromDraft(draft.fields))
    }
  }, [draft])

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !company || !draft || !fields) {
        throw new Error('Draft not loaded')
      }

      const fieldError = validateOcrDraftFields(fields)
      if (fieldError) {
        throw new Error(fieldError)
      }

      const ledgerError = validateOcrConfirmLedgers(ledgerBySystemKey)
      if (ledgerError) {
        throw new Error(ledgerError)
      }

      await trpcClient.ocr.updateDraft.mutate(
        buildOcrUpdateDraftInput({
          companyId,
          draftId: draft.id,
          fields,
        }),
      )

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

  function updateField<Key extends keyof OcrFieldsDraft>(
    key: Key,
    value: string,
  ) {
    setFields((current) => {
      if (!current) return current
      return {
        ...current,
        [key]: withEditedOcrField(current[key], value),
      }
    })
  }

  if (draftsQuery.isLoading) {
    return (
      <Screen title="OCR draft">
        <LoadingState />
      </Screen>
    )
  }

  if (draftsQuery.isError || !draft || !fields) {
    return (
      <Screen title="OCR draft">
        <EmptyState message="OCR draft not found or unavailable." />
      </Screen>
    )
  }

  const confirmable = isOcrDraftConfirmable(draft)
  const lowConfidenceFields = computeLowConfidenceFields(fields)

  return (
    <Screen
      title={fields.supplierName.value || 'OCR draft'}
      subtitle={fields.billNumber.value || 'Review extracted fields'}
      keyboardAvoiding
      footer={
        confirmable ? (
          <SaveScreenFooter
            error={error}
            loading={confirmMutation.isPending}
            message={message}
            onSubmit={() => confirmMutation.mutate()}
            submitLabel="Post bill"
          />
        ) : (
          <WizardFooter>
            <SecondaryButton label="Back" onPress={() => router.back()} />
          </WizardFooter>
        )
      }
    >
      {lowConfidenceFields.length > 0 ? (
        <View className="rounded-xl border border-warning/40 bg-warning/10 p-card-padding">
          <Text className="text-sm text-foreground">
            Low confidence fields: {lowConfidenceFields.join(', ')}
          </Text>
        </View>
      ) : null}

      <FormSection title="Extracted fields" icon="scan-outline">
        <FormFieldGroup label="Supplier name">
          <FormField
            placeholder="Supplier name"
            value={fields.supplierName.value}
            onChangeText={(value) => updateField('supplierName', value)}
          />
        </FormFieldGroup>
        <FormFieldGroup label="Supplier GSTIN">
          <FormField
            placeholder="GSTIN"
            autoCapitalize="characters"
            value={fields.supplierGstin.value}
            onChangeText={(value) => updateField('supplierGstin', value)}
          />
        </FormFieldGroup>
        <FormFieldGroup label="Bill number">
          <FormField
            placeholder="Bill number"
            value={fields.billNumber.value}
            onChangeText={(value) => updateField('billNumber', value)}
          />
        </FormFieldGroup>
        <DateField
          label="Bill date"
          value={fields.billDate.value}
          onChange={(value) => updateField('billDate', value)}
        />
        <FormFieldGroup label="Taxable amount">
          <FormField
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={fields.taxableAmount.value}
            onChangeText={(value) => updateField('taxableAmount', value)}
          />
        </FormFieldGroup>
        <FormFieldGroup label="GST amount">
          <FormField
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={fields.gstAmount.value}
            onChangeText={(value) => updateField('gstAmount', value)}
          />
        </FormFieldGroup>
        <FormFieldGroup label="Total amount">
          <FormField
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={fields.totalAmount.value}
            onChangeText={(value) => updateField('totalAmount', value)}
          />
        </FormFieldGroup>
        <Text className="text-sm text-muted-foreground">
          Total preview: {formatInr(fields.totalAmount.value || '0')}
        </Text>
      </FormSection>

      <DetailCard title="Status" icon="flag-outline">
        <Text className="text-sm text-muted-foreground">Draft status</Text>
        <Text className="font-medium text-foreground">{draft.status}</Text>
      </DetailCard>

      {!confirmable ? (
        <Text className="text-sm text-muted-foreground">
          This draft has already been posted.
        </Text>
      ) : null}
    </Screen>
  )
}
