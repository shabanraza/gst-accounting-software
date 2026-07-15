import { useRouter } from 'expo-router'
import { useState } from 'react'

import { Pressable, Text, TextInput, View } from '@/tw'
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
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-3xl font-bold text-gray-900">Set up company</Text>
      <TextInput
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        placeholder="Legal name"
        value={legalName}
        onChangeText={setLegalName}
      />
      <TextInput
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        placeholder="Trade name"
        value={tradeName}
        onChangeText={setTradeName}
      />
      <TextInput
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        placeholder="State code"
        value={stateCode}
        onChangeText={setStateCode}
      />
      {error ? <Text className="text-red-600">{error}</Text> : null}
      <Pressable
        className="items-center rounded-xl bg-teal-600 px-4 py-3"
        onPress={() => void handleCreate()}
      >
        <Text className="font-semibold text-white">
          Create company
        </Text>
      </Pressable>
    </View>
  )
}
