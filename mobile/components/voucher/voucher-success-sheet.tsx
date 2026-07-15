import * as React from 'react'
import { useRouter } from 'expo-router'

import { BottomSheet } from '@/components/ui/dialog'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import {
  openVoucherPrintPage,
  shareVoucherOnWhatsApp,
  type VoucherShareKind,
} from '@/lib/voucher-share'
import { Text, View } from '@/tw'

export type VoucherSuccessTarget = {
  kind: VoucherShareKind
  id: string
  number: string
  amount: string
}

export function VoucherSuccessSheet({
  open,
  onOpenChange,
  target,
  companyName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: VoucherSuccessTarget | null
  companyName: string
}) {
  const router = useRouter()
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [busyAction, setBusyAction] = React.useState<'download' | 'whatsapp' | null>(
    null,
  )

  React.useEffect(() => {
    if (!open) {
      setActionError(null)
      setBusyAction(null)
    }
  }, [open])

  if (!target) {
    return null
  }

  const savedLabel = target.kind === 'sales' ? 'Invoice saved' : 'Bill saved'
  const detailRoute =
    target.kind === 'sales'
      ? (`/(app)/sales/${target.id}` as const)
      : (`/(app)/purchases/${target.id}` as const)
  const createAnotherRoute =
    target.kind === 'sales'
      ? ('/(app)/sales/new' as const)
      : ('/(app)/purchases/new' as const)

  async function runAction(
    action: 'download' | 'whatsapp',
    runner: () => Promise<void>,
  ) {
    setActionError(null)
    setBusyAction(action)
    try {
      await runner()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Action failed. Try again.',
      )
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={savedLabel}
      description={`${target.number} · Download or share with your customer.`}
      maxHeightRatio={0.55}
    >
      <View className="gap-3">
        {actionError ? (
          <Text className="text-sm text-destructive">{actionError}</Text>
        ) : null}
        <PrimaryButton
          label={busyAction === 'download' ? 'Opening…' : 'Download / print PDF'}
          loading={busyAction === 'download'}
          disabled={busyAction !== null}
          onPress={() =>
            void runAction('download', () =>
              openVoucherPrintPage(target.kind, target.id),
            )
          }
        />
        <PrimaryButton
          label={busyAction === 'whatsapp' ? 'Opening…' : 'Share on WhatsApp'}
          loading={busyAction === 'whatsapp'}
          disabled={busyAction !== null}
          onPress={() =>
            void runAction('whatsapp', () =>
              shareVoucherOnWhatsApp({
                kind: target.kind,
                number: target.number,
                companyName,
                amount: target.amount,
                id: target.id,
              }),
            )
          }
        />
        <SecondaryButton
          label="View details"
          onPress={() => {
            if (busyAction !== null) return
            onOpenChange(false)
            router.replace(detailRoute as never)
          }}
        />
        <SecondaryButton
          label="Create another"
          onPress={() => {
            if (busyAction !== null) return
            onOpenChange(false)
            router.replace(createAnotherRoute as never)
          }}
        />
      </View>
    </BottomSheet>
  )
}
