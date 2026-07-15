import { useRouter } from 'expo-router'
import { useState } from 'react'

import { Pressable, Text, TextInput, View } from '@/tw'
import { Screen } from '@/components/screen'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export default function NewSalesInvoiceScreen() {
  const router = useRouter()
  const { companyId } = useWorkspace()
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleCreateStub() {
    setMessage('Use web voucher entry for full GST line posting. Mobile wizard is next.')
    router.back()
  }

  return (
    <Screen title="New invoice" subtitle="Quick create">
      <TextInput
        className="rounded-xl border border-gray-200 bg-white px-4 py-3"
        placeholder="Invoice number"
        value={invoiceNumber}
        onChangeText={setInvoiceNumber}
      />
      {message ? <Text className="text-gray-500">{message}</Text> : null}
      <Pressable
        className="items-center rounded-xl bg-indigo-600 px-4 py-3"
        onPress={() => void handleCreateStub()}
      >
        <Text className="font-semibold text-white">Continue</Text>
      </Pressable>
    </Screen>
  )
}
