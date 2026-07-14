import { z } from 'zod'

import { publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'

const listByCompanyInputSchema = z.object({
  companyId: z.string().uuid(),
})

export const createAuditRouter = (repository: AuditLogRepository) =>
  ({
    list: publicProcedure.input(listByCompanyInputSchema).query(({ input }) => {
      return repository.listByCompanyId(input.companyId)
    }),
  }) satisfies TRPCRouterRecord
