import { useLocalSearchParams } from 'expo-router'

import { PurchaseBillCreateScreen } from '@/features/purchase-bill-create-screen'

export default function NewPurchaseBillScreen() {
  const { fromGrn } = useLocalSearchParams<{ fromGrn?: string }>()

  return <PurchaseBillCreateScreen sourceGrnId={fromGrn} />
}
