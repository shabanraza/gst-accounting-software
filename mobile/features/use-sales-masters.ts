import { useQuery } from '@tanstack/react-query'

import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export function useSalesParties() {
  const { companyId } = useWorkspace()

  return useQuery({
    queryKey: ['sales-parties', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.parties.list.query({
        companyId: companyId!,
      }),
  })
}

export function useSalesItems() {
  const { companyId } = useWorkspace()

  return useQuery({
    queryKey: ['sales-items', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.inventory.listItems.query({
        companyId: companyId!,
      }),
  })
}
