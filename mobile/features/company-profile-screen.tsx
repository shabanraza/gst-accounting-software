import * as React from 'react'
import { useMutation } from '@tanstack/react-query'

import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import {
  buildUpdateCompanyProfileInput,
  createInitialCompanyProfileForm,
} from '@/lib/company-profile-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

const PROFILE_FIELDS = [
  { key: 'addressLine1', label: 'Address line 1' },
  { key: 'addressLine2', label: 'Address line 2' },
  { key: 'city', label: 'City' },
  { key: 'pincode', label: 'PIN code' },
  { key: 'pan', label: 'PAN' },
  { key: 'contactPhone', label: 'Phone' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'authorizedSignatory', label: 'Authorised signatory' },
  { key: 'bankName', label: 'Bank name' },
  { key: 'bankAccountNumber', label: 'Bank account number' },
  { key: 'bankIfsc', label: 'IFSC' },
  { key: 'invoiceTerms', label: 'Invoice terms' },
] as const

export function CompanyProfileScreen() {
  const { companyId, company, refresh } = useWorkspace()
  const [form, setForm] = React.useState(() =>
    createInitialCompanyProfileForm(company ?? undefined),
  )
  const [message, setMessage] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (company) {
      setForm(createInitialCompanyProfileForm(company))
    }
  }, [company])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Workspace not ready')
      return trpcClient.companies.updateProfile.mutate(
        buildUpdateCompanyProfileInput(form, companyId),
      )
    },
    onSuccess: async () => {
      await refresh()
      setMessage('Company profile saved.')
      setError(null)
    },
    onError: (mutationError) => {
      setMessage(null)
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to save profile.',
      )
    },
  })

  return (
    <Screen
      title="Company profile"
      subtitle={company?.tradeName ?? undefined}
      keyboardAvoiding
    >
      <View className="gap-section-header">
        <SectionHeader title="Business details" compact icon="business-outline" />
        {PROFILE_FIELDS.map((field) => (
          <View key={field.key}>
            <Text className="mb-1 text-sm text-muted-foreground">{field.label}</Text>
            <FormField
              placeholder={field.label}
              value={form[field.key]}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, [field.key]: value }))
              }
            />
          </View>
        ))}
      </View>

      {message ? <Text className="text-sm text-primary">{message}</Text> : null}
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <PrimaryButton
        label={saveMutation.isPending ? 'Saving…' : 'Save profile'}
        loading={saveMutation.isPending}
        disabled={saveMutation.isPending}
        onPress={() => saveMutation.mutate()}
      />
    </Screen>
  )
}
