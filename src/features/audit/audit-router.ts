import { z } from 'zod'

import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'
import type { UserDirectory } from '#/features/team/user-directory.ts'

const listByCompanyInputSchema = z.object({
  companyId: z.string().uuid(),
})

export const createAuditRouter = (
  repository: AuditLogRepository,
  users: UserDirectory,
) =>
  ({
    list: capabilityProcedure('view_audit')
      .input(listByCompanyInputSchema)
      .query(async ({ input }) => {
        // Reversed first so events from the same instant stay newest first.
        const events = (await repository.listByCompanyId(input.companyId))
          .reverse()
          .sort(
            (left, right) =>
              right.createdAt.getTime() - left.createdAt.getTime(),
          )
        const actors = await users.listByIds([
          ...new Set(events.map((event) => event.actorUserId)),
        ])
        const nameById = new Map(
          actors.map((actor) => [actor.id, actor.name || actor.email]),
        )
        return events.map((event) => ({
          ...event,
          actorName: nameById.get(event.actorUserId) ?? '',
        }))
      }),
  }) satisfies TRPCRouterRecord
