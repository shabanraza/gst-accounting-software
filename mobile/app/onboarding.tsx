import { useRouter } from 'expo-router'
import { useState } from 'react'

import { AuthShell, FormField, PrimaryButton } from '@/components/screen'
import { Text } from '@/tw'
import { trpcClient } from '@/lib/trpc-client'

export default function OnboardingScreen() {
  const router = useRouter()
  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [stateCode, setStateCode] = useState('27')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setError(null)
    try {
      await trpcClient.companies.createWithSetup.mutate({
        legalName,
        tradeName,
        gstin: null,
        stateCode,
        financialYearStart: `${new Date().getFullYear()}-04-01`,
        businessType: 'trading',
      })
      router.replace('/(app)/(tabs)/dashboard')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Setup failed')
    }
  }

  return (
    <AuthShell title="Set up company">
      <FormField
        placeholder="Legal name"
        value={legalName}
        onChangeText={setLegalName}
      />
      <FormField
        placeholder="Trade name"
        value={tradeName}
        onChangeText={setTradeName}
      />
      <FormField
        placeholder="State code"
        value={stateCode}
        onChangeText={setStateCode}
      />
      {error ? <Text className="text-icon-accent-red">{error}</Text> : null}
      <PrimaryButton label="Create company" onPress={() => void handleCreate()} />
    </AuthShell>
  )
}
