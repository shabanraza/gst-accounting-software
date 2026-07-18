import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { CreateScreenFooter } from '@/components/layout/create-screen-footer'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import {
  buildCreateGodownInput,
  buildUpdateGodownInput,
  createInitialGodownForm,
  validateGodownForm,
  type GodownFormDraft,
} from '@/lib/godown-form'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

type GodownFormScreenProps = {
  mode: 'create' | 'edit'
  godownId?: string
  initialForm?: GodownFormDraft
}

export function GodownFormScreen({
  mode,
  godownId,
  initialForm,
}: GodownFormScreenProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const [form, setForm] = React.useState<GodownFormDraft>(
    () => initialForm ?? createInitialGodownForm(),
  )
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (initialForm) setForm(initialForm)
  }, [initialForm])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Workspace not ready')

      const validationError = validateGodownForm(form)
      if (validationError) throw new Error(validationError)

      if (mode === 'edit') {
        if (!godownId) throw new Error('Godown not found')
        return trpcClient.inventory.updateGodown.mutate(
          buildUpdateGodownInput(form, companyId, godownId),
        )
      }

      return trpcClient.inventory.createGodown.mutate(
        buildCreateGodownInput(form, companyId),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'godowns'] })
      await queryClient.invalidateQueries({ queryKey: ['workspace'] })
      router.back()
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to save godown.',
      )
    },
  })

  return (
    <Screen
      title={mode === 'edit' ? 'Edit godown' : 'New godown'}
      subtitle="Warehouse / storage location"
      keyboardAvoiding
      footer={
        <CreateScreenFooter
          cancelLabel="Cancel"
          error={error}
          loading={saveMutation.isPending}
          onCancel={() => router.back()}
          onSubmit={() => saveMutation.mutate()}
          submitLabel={mode === 'edit' ? 'Save godown' : 'Create godown'}
        />
      }
    >
      <FormSection title="Details" icon="business-outline">
        <FormFieldGroup label="Godown name">
          <FormField
            placeholder="Main Godown"
            value={form.name}
            onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          />
        </FormFieldGroup>
      </FormSection>
    </Screen>
  )
}
