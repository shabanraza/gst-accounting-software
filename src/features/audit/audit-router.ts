import { z } from 'zod'

import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'

const listByCompanyInputSchema = z.object({
  companyId: z.string().uuid(),
})

export const createAuditRouter = (repository: AuditLogRepository) =>
  ({
    list: capabilityProcedure('view_audit')
      .input(listByCompanyInputSchema)
      .query(({ input }) => {
      return repository.listByCompanyId(input.companyId)
    }),
  }) satisfies TRPCRouterRecord
