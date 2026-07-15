import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Pressable } from 'react-native'

import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
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
import { Text, View } from '@/tw'
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
    <View className="gap-3 rounded-xl border border-border bg-card p-card-padding">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-foreground">Line {index + 1}</Text>
        {canRemove ? (
          <Pressable onPress={onRemove}>
            <Text className="text-sm font-medium text-destructive">Remove</Text>
          </Pressable>
        ) : null}
      </View>
      <PickerField
        label="Ledger"
        value={selected?.name}
        placeholder="Select account"
        onPress={() => setPickerOpen(true)}
      />
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1 text-sm text-muted-foreground">Debit</Text>
          <FormField
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={line.debit}
            onChangeText={(debit) => onChange({ ...line, debit })}
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-sm text-muted-foreground">Credit</Text>
          <FormField
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={line.credit}
            onChangeText={(credit) => onChange({ ...line, credit })}
          />
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
    </View>
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
    <Screen title="Journal entry" subtitle="Manual double-entry voucher" keyboardAvoiding>
      <View className="gap-section-header">
        <SectionHeader title="Header" compact icon="create-outline" />
        <FormField
          placeholder="YYYY-MM-DD"
          value={form.entryDate}
          onChangeText={(entryDate) =>
            setForm((current) => ({ ...current, entryDate }))
          }
        />
        <FormField
          placeholder="Narration"
          value={form.narration}
          onChangeText={(narration) =>
            setForm((current) => ({ ...current, narration }))
          }
        />
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Lines" compact icon="list-outline" />
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
        <SecondaryButton
          label="Add line"
          onPress={() =>
            setForm((current) => ({
              ...current,
              lines: [...current.lines, createEmptyJournalLine()],
            }))
          }
        />
      </View>

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <SecondaryButton label="Cancel" onPress={() => router.back()} />
        </View>
        <View className="flex-1">
          <PrimaryButton
            label={saveMutation.isPending ? 'Posting…' : 'Post entry'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>
    </Screen>
  )
}
