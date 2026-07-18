import * as React from 'react'

import { WizardFooter } from '@/components/layout/wizard-footer'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { Text, View } from '@/tw'

export function CreateScreenFooter({
  error,
  cancelLabel = 'Cancel',
  onCancel,
  submitLabel,
  loading = false,
  onSubmit,
  children,
}: {
  error?: string | null
  cancelLabel?: string
  onCancel: () => void
  submitLabel: string
  loading?: boolean
  onSubmit: () => void
  children?: React.ReactNode
}) {
  return (
    <WizardFooter>
      {children}
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <SecondaryButton
            disabled={loading}
            label={cancelLabel}
            onPress={onCancel}
          />
        </View>
        <View className="flex-1">
          <PrimaryButton
            disabled={loading}
            label={submitLabel}
            loading={loading}
            onPress={onSubmit}
          />
        </View>
      </View>
    </WizardFooter>
  )
}

export function SaveScreenFooter({
  error,
  submitLabel,
  loading = false,
  onSubmit,
  message,
}: {
  error?: string | null
  submitLabel: string
  loading?: boolean
  onSubmit: () => void
  message?: string | null
}) {
  return (
    <WizardFooter>
      {message ? <Text className="text-sm text-primary">{message}</Text> : null}
      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
      <PrimaryButton
        disabled={loading}
        label={submitLabel}
        loading={loading}
        onPress={onSubmit}
      />
    </WizardFooter>
  )
}
