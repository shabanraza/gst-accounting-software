import { useLocalSearchParams } from 'expo-router'

import { SalesInvoiceCreateScreen } from '@/features/sales-invoice-create-screen'

export default function NewSalesInvoiceScreen() {
  const { fromDocument } = useLocalSearchParams<{ fromDocument?: string }>()

  return <SalesInvoiceCreateScreen sourceDocumentId={fromDocument} />
}
