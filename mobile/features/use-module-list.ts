import { useQuery } from '@tanstack/react-query'

import { getModuleById } from '@/lib/nav-config'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

type ModuleRecord = Record<string, unknown>

function getNestedProcedure(namespace: string, procedure: string) {
  const router = (trpcClient as Record<string, Record<string, unknown>>)[
    namespace
  ]
  const method = router?.[procedure]
  if (
    (typeof method !== 'object' && typeof method !== 'function') ||
    method === null
  ) {
    return null
  }
  return method as {
    query?: (input: unknown) => Promise<unknown>
    mutate?: (input: unknown) => Promise<unknown>
  }
}

export function useModuleList(moduleId: string) {
  const module = getModuleById(moduleId)
  const { companyId, companyStateCode, isReady } = useWorkspace()

  return useQuery({
    queryKey: ['module-list', moduleId, companyId, companyStateCode],
    enabled: Boolean(
      isReady && module && companyId && module.trpcNamespace && module.listProcedure,
    ),
    queryFn: async () => {
      if (!module?.trpcNamespace || !module.listProcedure || !companyId) {
        return []
      }

      const procedure = getNestedProcedure(
        module.trpcNamespace,
        module.listProcedure,
      )

      if (!procedure?.query) {
        return []
      }

      const input =
        module.trpcNamespace === 'companies'
          ? undefined
          : module.trpcNamespace === 'dashboard'
            ? {
                companyId,
                companyStateCode: companyStateCode ?? '27',
              }
            : { companyId }

      const result = await (input === undefined
        ? (procedure.query as () => Promise<unknown>)()
        : procedure.query(input))

      if (Array.isArray(result)) {
        return result as Array<ModuleRecord>
      }

      if (
        result &&
        typeof result === 'object' &&
        'items' in result &&
        Array.isArray((result as { items: unknown }).items)
      ) {
        return (result as { items: Array<ModuleRecord> }).items
      }

      return result ? [result as ModuleRecord] : []
    },
  })
}
