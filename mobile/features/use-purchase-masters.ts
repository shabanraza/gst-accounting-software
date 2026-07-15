import { useQuery } from '@tanstack/react-query'

import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export function usePurchaseParties() {
  const { companyId } = useWorkspace()

  return useQuery({
    queryKey: ['purchase-parties', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.parties.list.query({
        companyId: companyId!,
      }),
  })
}

export function usePurchaseItems() {
  const { companyId } = useWorkspace()

  return useQuery({
    queryKey: ['purchase-items', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.inventory.listItems.query({
        companyId: companyId!,
      }),
  })
}

export function usePurchaseOrders() {
  const { companyId } = useWorkspace()

  return useQuery({
    queryKey: ['purchase-orders', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.purchaseOrders.list.query({
        companyId: companyId!,
      }),
  })
}
