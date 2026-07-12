import { z } from 'zod'

import { getDashboardSummary } from '#/features/dashboard/dashboard-summary-service.ts'
import { publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { DashboardSummaryRepository } from '#/features/dashboard/dashboard-summary-service.ts'

const getSummaryInputSchema = z.object({
  companyId: z.string().uuid(),
  summaryDate: z.string().min(1),
})

export const createDashboardRouter = (
  repository: DashboardSummaryRepository,
) =>
  ({
    getSummary: publicProcedure
      .input(getSummaryInputSchema)
      .query(({ input }) => {
        return getDashboardSummary(
          repository,
          input.companyId,
          input.summaryDate,
        )
      }),
  }) satisfies TRPCRouterRecord
