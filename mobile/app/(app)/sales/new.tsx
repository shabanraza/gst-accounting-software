import { useRouter } from 'expo-router'
import { useState } from 'react'

import { FormField, PrimaryButton, Screen } from '@/components/screen'
import { Text } from '@/tw'

export default function NewSalesInvoiceScreen() {
  const router = useRouter()
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  async function handleCreateStub() {
    setMessage('Use web voucher entry for full GST line posting. Mobile wizard is next.')
    router.back()
  }

  return (
    <Screen title="New invoice" subtitle="Quick create">
      <FormField
        placeholder="Invoice number"
        value={invoiceNumber}
        onChangeText={setInvoiceNumber}
      />
      {message ? <Text className="text-muted-foreground">{message}</Text> : null}
      <PrimaryButton label="Continue" onPress={() => void handleCreateStub()} />
    </Screen>
  )
}
