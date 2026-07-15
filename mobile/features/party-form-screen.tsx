import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { EmptyState } from '@/components/data/empty-state'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { WizardFooter } from '@/components/layout/wizard-footer'
import { PrimaryButton } from '@/components/ui/button'
import { OptionChip } from '@/components/ui/chip'
import { FormField } from '@/components/ui/form-field'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
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
      keyboardAvoiding
      footer={
        <WizardFooter>
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          <PrimaryButton
            label={saveMutation.isPending ? 'Saving…' : 'Save'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </WizardFooter>
      }
    >
      {!isReady ? <EmptyState message="Loading workspace…" /> : null}

      <FormSection title="Basics" icon="person-outline">
        <View className="gap-3">
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
          <PickerField
            label="State / POS"
            value={
              selectedState
                ? `${selectedState.name} (${selectedState.code})`
                : form.stateCode
            }
            onPress={() => setStatePickerOpen(true)}
          />
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
      </FormSection>

      <FormSection title="Address" icon="location-outline">
        <View className="gap-3">
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
      </FormSection>

      <FormSection title="Contact" icon="call-outline">
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
      </FormSection>

      <FormSection title="Credit" icon="wallet-outline">
        <View className="gap-3">
          <PickerField
            label="Payment terms"
            value={selectedTerms?.label ?? `${form.paymentTermsDays} days`}
            onPress={() => setTermsPickerOpen(true)}
          />
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
      </FormSection>

      <PickerModal
        visible={statePickerOpen}
        title="Select state"
        options={indianStates.map((state) => ({
          key: state.code,
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
          key: String(term.days),
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
