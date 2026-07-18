import * as React from 'react'
import { useMutation } from '@tanstack/react-query'

import { SaveScreenFooter } from '@/components/layout/create-screen-footer'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import {
  buildUpdateCompanyProfileInput,
  createInitialCompanyProfileForm,
} from '@/lib/company-profile-form'
import { trpcClient } from '@/lib/trpc-client'
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
      footer={
        <SaveScreenFooter
          error={error}
          loading={saveMutation.isPending}
          message={message}
          onSubmit={() => saveMutation.mutate()}
          submitLabel="Save profile"
        />
      }
    >
      <FormSection title="Business details" icon="business-outline">
        {PROFILE_FIELDS.map((field) => (
          <FormFieldGroup key={field.key} label={field.label}>
            <FormField
              placeholder={field.label}
              value={form[field.key]}
              onChangeText={(value) =>
                setForm((current) => ({ ...current, [field.key]: value }))
              }
            />
          </FormFieldGroup>
        ))}
      </FormSection>
    </Screen>
  )
}
