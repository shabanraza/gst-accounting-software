import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import {
  buildCreateGodownInput,
  buildUpdateGodownInput,
  createInitialGodownForm,
  validateGodownForm,
  type GodownFormDraft,
} from '@/lib/godown-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
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
    >
      <View className="gap-section-header">
        <SectionHeader title="Details" compact icon="business-outline" />
        <FormField
          placeholder="Godown name"
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
        />
      </View>

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <SecondaryButton label="Cancel" onPress={() => router.back()} />
        </View>
        <View className="flex-1">
          <PrimaryButton
            label={saveMutation.isPending ? 'Saving…' : 'Save godown'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>
    </Screen>
  )
}
