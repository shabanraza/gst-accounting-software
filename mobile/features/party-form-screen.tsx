import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Modal, Pressable } from 'react-native'

import { SectionHeader } from '@/components/section-header'
import {
  CardRow,
  EmptyState,
  FormField,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/screen'
import {
  indianStates,
  paymentTermsOptions,
  partyTypeLabel,
} from '@/lib/india-masters'
import {
  buildCreatePartyInput,
  buildUpdatePartyInput,
  createInitialPartyForm,
  partyFormFromRecord,
  validatePartyForm,
  validatePartyLedgerMappings,
  type PartyFormDraft,
  type PartyType,
} from '@/lib/party-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`rounded-full border px-4 py-2 ${active ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-medium ${active ? 'text-primary' : 'text-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function PickerModal({
  visible,
  title,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  options: Array<{ value: string; label: string }>
  onSelect: (value: string) => void
  onClose: () => void
}) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[70%] rounded-t-3xl bg-background p-page-x pb-page-bottom">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">{title}</Text>
            <Pressable onPress={onClose}>
              <Text className="text-sm font-medium text-primary">Close</Text>
            </Pressable>
          </View>
          <View className="gap-3">
            {options.map((option) => (
              <CardRow
                key={option.value}
                title={option.label}
                onPress={() => {
                  onSelect(option.value)
                  onClose()
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )
}

type PartyFormScreenProps = {
  mode: 'create' | 'edit'
  partyId?: string
  initialForm?: PartyFormDraft
  defaultPartyType?: PartyType
}

export function PartyFormScreen({
  mode,
  partyId,
  initialForm,
  defaultPartyType = 'customer',
}: PartyFormScreenProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey, isReady } = useWorkspace()
  const [form, setForm] = React.useState<PartyFormDraft>(
    () => initialForm ?? createInitialPartyForm(defaultPartyType),
  )
  const [statePickerOpen, setStatePickerOpen] = React.useState(false)
  const [termsPickerOpen, setTermsPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (initialForm) {
      setForm(initialForm)
    }
  }, [initialForm])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) {
        throw new Error('Workspace not ready')
      }

      const validationError = validatePartyForm(form)
      if (validationError) {
        throw new Error(validationError)
      }

      const ledgerError = validatePartyLedgerMappings({
        partyType: form.partyType,
        ledgerBySystemKey,
        isEdit: mode === 'edit',
      })
      if (ledgerError) {
        throw new Error(ledgerError)
      }

      if (mode === 'edit' && partyId) {
        return trpcClient.parties.update.mutate(
          buildUpdatePartyInput(form, { id: partyId, companyId }),
        )
      }

      return trpcClient.parties.create.mutate(
        buildCreatePartyInput(form, { companyId, ledgerBySystemKey }),
      )
    },
    onSuccess: async (party) => {
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'parties'] })
      await queryClient.invalidateQueries({ queryKey: ['sales-parties', companyId] })
      if (mode === 'edit') {
        router.back()
        return
      }
      router.replace(`/(app)/parties/${party.id}` as never)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to save party.',
      )
    },
  })

  const selectedState = indianStates.find((state) => state.code === form.stateCode)
  const selectedTerms = paymentTermsOptions.find(
    (term) => String(term.days) === form.paymentTermsDays,
  )

  return (
    <Screen
      title={mode === 'edit' ? 'Edit party' : 'New party'}
      subtitle="Billing, GST, and contact details"
    >
      {!isReady ? <EmptyState message="Loading workspace…" /> : null}

      <View className="gap-section-header">
        <SectionHeader title="Basics" compact icon="person-outline" />
        <View>
          <Text className="mb-1 text-sm text-muted-foreground">Name</Text>
          <FormField
            placeholder="Legal / trade name"
            value={form.name}
            onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm text-muted-foreground">Type</Text>
          <View className="flex-row flex-wrap gap-2">
            {(['customer', 'supplier', 'both'] as Array<PartyType>).map(
              (type) => (
                <OptionChip
                  key={type}
                  label={partyTypeLabel(type)}
                  active={form.partyType === type}
                  onPress={() =>
                    setForm((current) => ({ ...current, partyType: type }))
                  }
                />
              ),
            )}
          </View>
        </View>
        <Pressable
          className="rounded-xl border border-border bg-card px-4 py-3"
          onPress={() => setStatePickerOpen(true)}
        >
          <Text className="text-sm text-muted-foreground">State / POS</Text>
          <Text className="font-medium text-foreground">
            {selectedState
              ? `${selectedState.name} (${selectedState.code})`
              : form.stateCode}
          </Text>
        </Pressable>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-sm text-muted-foreground">GSTIN</Text>
            <FormField
              placeholder="Optional"
              autoCapitalize="characters"
              value={form.gstin}
              onChangeText={(gstin) =>
                setForm((current) => ({ ...current, gstin }))
              }
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm text-muted-foreground">PAN</Text>
            <FormField
              placeholder="ABCDE1234F"
              autoCapitalize="characters"
              value={form.pan}
              onChangeText={(pan) => setForm((current) => ({ ...current, pan }))}
            />
          </View>
        </View>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Address" compact icon="location-outline" />
        <FormField
          placeholder="Address line 1"
          value={form.addressLine1}
          onChangeText={(addressLine1) =>
            setForm((current) => ({ ...current, addressLine1 }))
          }
        />
        <FormField
          placeholder="Address line 2"
          value={form.addressLine2}
          onChangeText={(addressLine2) =>
            setForm((current) => ({ ...current, addressLine2 }))
          }
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              placeholder="City"
              value={form.city}
              onChangeText={(city) => setForm((current) => ({ ...current, city }))}
            />
          </View>
          <View className="flex-1">
            <FormField
              placeholder="PIN code"
              keyboardType="number-pad"
              value={form.pincode}
              onChangeText={(pincode) =>
                setForm((current) => ({ ...current, pincode }))
              }
            />
          </View>
        </View>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Contact" compact icon="call-outline" />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormField
              placeholder="Phone"
              keyboardType="phone-pad"
              value={form.contactPhone}
              onChangeText={(contactPhone) =>
                setForm((current) => ({ ...current, contactPhone }))
              }
            />
          </View>
          <View className="flex-1">
            <FormField
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.contactEmail}
              onChangeText={(contactEmail) =>
                setForm((current) => ({ ...current, contactEmail }))
              }
            />
          </View>
        </View>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Credit" compact icon="wallet-outline" />
        <Pressable
          className="rounded-xl border border-border bg-card px-4 py-3"
          onPress={() => setTermsPickerOpen(true)}
        >
          <Text className="text-sm text-muted-foreground">Payment terms</Text>
          <Text className="font-medium text-foreground">
            {selectedTerms?.label ?? `${form.paymentTermsDays} days`}
          </Text>
        </Pressable>
        <View>
          <Text className="mb-1 text-sm text-muted-foreground">Credit limit</Text>
          <FormField
            placeholder="Optional"
            keyboardType="decimal-pad"
            value={form.creditLimit}
            onChangeText={(creditLimit) =>
              setForm((current) => ({ ...current, creditLimit }))
            }
          />
        </View>
      </View>

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <SecondaryButton label="Cancel" onPress={() => router.back()} />
        </View>
        <View className="flex-1">
          <PrimaryButton
            label={saveMutation.isPending ? 'Saving…' : 'Save'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>

      <PickerModal
        visible={statePickerOpen}
        title="Select state"
        options={indianStates.map((state) => ({
          value: state.code,
          label: `${state.name} (${state.code})`,
        }))}
        onSelect={(stateCode) =>
          setForm((current) => ({ ...current, stateCode }))
        }
        onClose={() => setStatePickerOpen(false)}
      />

      <PickerModal
        visible={termsPickerOpen}
        title="Payment terms"
        options={paymentTermsOptions.map((term) => ({
          value: String(term.days),
          label: term.label,
        }))}
        onSelect={(paymentTermsDays) =>
          setForm((current) => ({ ...current, paymentTermsDays }))
        }
        onClose={() => setTermsPickerOpen(false)}
      />
    </Screen>
  )
}
