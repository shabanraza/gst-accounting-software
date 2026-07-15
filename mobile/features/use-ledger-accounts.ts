import { useQuery } from '@tanstack/react-query'

import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export function useLedgerAccounts() {
  const { companyId } = useWorkspace()

  return useQuery({
    queryKey: ['ledger-accounts', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.accounting.listLedgerAccounts.query({
        companyId: companyId!,
      }),
  })
}
