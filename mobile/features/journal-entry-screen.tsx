import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { CreateScreenFooter } from '@/components/layout/create-screen-footer'
import { FormSection } from '@/components/layout/form-section'
import { LineCard } from '@/components/layout/line-card'
import { Screen } from '@/components/layout/screen'
import { DateField } from '@/components/ui/date-field'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { AddLineButton } from '@/components/voucher/add-line-button'
import { useLedgerAccounts } from '@/features/use-ledger-accounts'
import {
  buildPostLedgerEntryInput,
  createEmptyJournalLine,
  createInitialJournalForm,
  validateJournalForm,
  type JournalFormDraft,
  type JournalLineDraft,
} from '@/lib/journal-form'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function JournalLineEditor({
  line,
  index,
  accounts,
  onChange,
  onRemove,
  canRemove,
}: {
  line: JournalLineDraft
  index: number
  accounts: Array<{ id: string; name: string }>
  onChange: (line: JournalLineDraft) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const selected = accounts.find((account) => account.id === line.ledgerAccountId)

  return (
    <LineCard
      canRemove={canRemove}
      onRemove={onRemove}
      title={`Line ${index + 1}`}
    >
      <PickerField
        label="Ledger"
        value={selected?.name}
        placeholder="Select account"
        onPress={() => setPickerOpen(true)}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormFieldGroup label="Debit">
            <FormField
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={line.debit}
              onChangeText={(debit) => onChange({ ...line, debit })}
            />
          </FormFieldGroup>
        </View>
        <View className="flex-1">
          <FormFieldGroup label="Credit">
            <FormField
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={line.credit}
              onChangeText={(credit) => onChange({ ...line, credit })}
            />
          </FormFieldGroup>
        </View>
      </View>
      <PickerModal
        visible={pickerOpen}
        title="Ledger account"
        options={accounts.map((account) => ({
          key: account.id,
          label: account.name,
        }))}
        onSelect={(ledgerAccountId) => onChange({ ...line, ledgerAccountId })}
        onClose={() => setPickerOpen(false)}
      />
    </LineCard>
  )
}

export function JournalEntryScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const ledgersQuery = useLedgerAccounts()
  const [form, setForm] = React.useState<JournalFormDraft>(createInitialJournalForm)
  const [error, setError] = React.useState<string | null>(null)

  const accounts = (ledgersQuery.data ?? []).map((account) => ({
    id: account.id,
    name: account.name,
  }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Workspace not ready')

      const validationError = validateJournalForm(form)
      if (validationError) throw new Error(validationError)

      return trpcClient.accounting.postLedgerEntry.mutate(
        buildPostLedgerEntryInput(form, companyId),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ledger-accounts'] })
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'journal'] })
      router.back()
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to post journal entry.',
      )
    },
  })

  function updateLine(index: number, line: JournalLineDraft) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((entry, entryIndex) =>
        entryIndex === index ? line : entry,
      ),
    }))
  }

  return (
    <Screen
      title="Journal entry"
      subtitle="Manual double-entry voucher"
      keyboardAvoiding
      footer={
        <CreateScreenFooter
          error={error}
          loading={saveMutation.isPending}
          onCancel={() => router.back()}
          onSubmit={() => saveMutation.mutate()}
          submitLabel="Post entry"
        />
      }
    >
      <FormSection title="Header" icon="create-outline">
        <DateField
          label="Date"
          value={form.entryDate}
          onChange={(entryDate) =>
            setForm((current) => ({ ...current, entryDate }))
          }
        />
        <FormFieldGroup label="Narration">
          <FormField
            placeholder="Optional notes"
            value={form.narration}
            onChangeText={(narration) =>
              setForm((current) => ({ ...current, narration }))
            }
          />
        </FormFieldGroup>
      </FormSection>

      <FormSection title="Lines" icon="list-outline">
        <View className="gap-3">
          {form.lines.map((line, index) => (
            <JournalLineEditor
              key={line.key}
              line={line}
              index={index}
              accounts={accounts}
              onChange={(nextLine) => updateLine(index, nextLine)}
              onRemove={() =>
                setForm((current) => ({
                  ...current,
                  lines: current.lines.filter((entry) => entry.key !== line.key),
                }))
              }
              canRemove={form.lines.length > 2}
            />
          ))}
          <AddLineButton
            onPress={() =>
              setForm((current) => ({
                ...current,
                lines: [...current.lines, createEmptyJournalLine()],
              }))
            }
          />
        </View>
      </FormSection>
    </Screen>
  )
}
