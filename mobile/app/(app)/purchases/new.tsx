import { Screen, EmptyState } from '@/components/screen'

export default function NewPurchaseBillScreen() {
  return (
    <Screen title="New purchase bill" subtitle="Capture or enter bill">
      <EmptyState message="Create purchase bills with line items on web for now. Use OCR capture for mobile bill intake." />
    </Screen>
  )
}
