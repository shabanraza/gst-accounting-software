import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { EmptyState } from '@/components/data/empty-state'
import {
  CreateScreenFooter,
  SaveScreenFooter,
} from '@/components/layout/create-screen-footer'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { OptionChip } from '@/components/ui/chip'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
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
import {
  useFormPickerCoordination,
} from '@/lib/form-picker-coordination'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

type PartyFormScreenProps = {
  mode: 'create' | 'edit'
  partyId?: string
  initialForm?: PartyFormDraft
  defaultPartyType?: PartyType
}

const PARTY_PICKERS = ['state', 'terms'] as const

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
  const pickers = useFormPickerCoordination(PARTY_PICKERS)
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

  const footer =
    mode === 'edit' ? (
      <SaveScreenFooter
        error={error}
        loading={saveMutation.isPending}
        onSubmit={() => saveMutation.mutate()}
        submitLabel="Save changes"
      />
    ) : (
      <CreateScreenFooter
        error={error}
        loading={saveMutation.isPending}
        onCancel={() => router.back()}
        onSubmit={() => saveMutation.mutate()}
        submitLabel="Create party"
      />
    )

  return (
      <Screen
        title={mode === 'edit' ? 'Edit party' : 'New party'}
        subtitle="Billing, GST, and contact details"
        keyboardAvoiding
        footer={footer}
      >
      {!isReady ? <EmptyState message="Loading workspace…" /> : null}

      <FormSection title="Basics" icon="person-outline">
        <View className="gap-3">
          <FormFieldGroup label="Name">
            <FormField
              placeholder="Legal / trade name"
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
            />
          </FormFieldGroup>
          <FormFieldGroup label="Type">
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
          </FormFieldGroup>
          <PickerField
            label="State / POS"
            value={
              selectedState
                ? `${selectedState.name} (${selectedState.code})`
                : form.stateCode
            }
            onPress={() => pickers.open('state')}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormFieldGroup label="GSTIN">
                <FormField
                  placeholder="Optional"
                  autoCapitalize="characters"
                  value={form.gstin}
                  onChangeText={(gstin) =>
                    setForm((current) => ({ ...current, gstin }))
                  }
                />
              </FormFieldGroup>
            </View>
            <View className="flex-1">
              <FormFieldGroup label="PAN">
                <FormField
                  placeholder="ABCDE1234F"
                  autoCapitalize="characters"
                  value={form.pan}
                  onChangeText={(pan) => setForm((current) => ({ ...current, pan }))}
                />
              </FormFieldGroup>
            </View>
          </View>
        </View>
      </FormSection>

      <FormSection title="Address" icon="location-outline">
        <View className="gap-3">
          <FormFieldGroup label="Address line 1">
            <FormField
              placeholder="Street, building"
              value={form.addressLine1}
              onChangeText={(addressLine1) =>
                setForm((current) => ({ ...current, addressLine1 }))
              }
            />
          </FormFieldGroup>
          <FormFieldGroup label="Address line 2">
            <FormField
              placeholder="Area, landmark"
              value={form.addressLine2}
              onChangeText={(addressLine2) =>
                setForm((current) => ({ ...current, addressLine2 }))
              }
            />
          </FormFieldGroup>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormFieldGroup label="City">
                <FormField
                  placeholder="City"
                  value={form.city}
                  onChangeText={(city) => setForm((current) => ({ ...current, city }))}
                />
              </FormFieldGroup>
            </View>
            <View className="flex-1">
              <FormFieldGroup label="PIN code">
                <FormField
                  placeholder="000000"
                  keyboardType="number-pad"
                  value={form.pincode}
                  onChangeText={(pincode) =>
                    setForm((current) => ({ ...current, pincode }))
                  }
                />
              </FormFieldGroup>
            </View>
          </View>
        </View>
      </FormSection>

      <FormSection title="Contact" icon="call-outline">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormFieldGroup label="Phone">
              <FormField
                placeholder="10-digit mobile"
                keyboardType="phone-pad"
                value={form.contactPhone}
                onChangeText={(contactPhone) =>
                  setForm((current) => ({ ...current, contactPhone }))
                }
              />
            </FormFieldGroup>
          </View>
          <View className="flex-1">
            <FormFieldGroup label="Email">
              <FormField
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.contactEmail}
                onChangeText={(contactEmail) =>
                  setForm((current) => ({ ...current, contactEmail }))
                }
              />
            </FormFieldGroup>
          </View>
        </View>
      </FormSection>

      <FormSection title="Credit" icon="wallet-outline">
        <View className="gap-3">
          <PickerField
            label="Payment terms"
            value={selectedTerms?.label ?? `${form.paymentTermsDays} days`}
            onPress={() => pickers.open('terms')}
          />
          <FormFieldGroup label="Credit limit">
            <FormField
              placeholder="Optional"
              keyboardType="decimal-pad"
              value={form.creditLimit}
              onChangeText={(creditLimit) =>
                setForm((current) => ({ ...current, creditLimit }))
              }
            />
          </FormFieldGroup>
        </View>
      </FormSection>

      <PickerModal
        visible={pickers.isOpen('state')}
        title="Select state"
        options={indianStates.map((state) => ({
          key: state.code,
          label: `${state.name} (${state.code})`,
        }))}
        onSelect={(stateCode) =>
          setForm((current) => ({ ...current, stateCode }))
        }
        onClose={pickers.closeAll}
      />

      <PickerModal
        visible={pickers.isOpen('terms')}
        title="Payment terms"
        options={paymentTermsOptions.map((term) => ({
          key: String(term.days),
          label: term.label,
        }))}
        onSelect={(paymentTermsDays) =>
          setForm((current) => ({ ...current, paymentTermsDays }))
        }
        onClose={pickers.closeAll}
      />
    </Screen>
  )
}
