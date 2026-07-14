import { z } from 'zod'

import { getOwnerDashboardSnapshot } from '#/features/dashboard/dashboard-owner-service.ts'
import { getDashboardSummary } from '#/features/dashboard/dashboard-summary-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { OwnerDashboardDeps } from '#/features/dashboard/dashboard-owner-service.ts'
import type { DashboardSummaryRepository } from '#/features/dashboard/dashboard-summary-service.ts'

const getSummaryInputSchema = z.object({
  companyId: z.string().uuid(),
  summaryDate: z.string().min(1),
})

const getOwnerSnapshotInputSchema = z.object({
  companyId: z.string().uuid(),
  asOfDate: z.string().optional(),
  companyStateCode: z.string().length(2),
})

export const createDashboardRouter = (
  repository: DashboardSummaryRepository,
  ownerDeps?: OwnerDashboardDeps,
) =>
  ({
    getSummary: capabilityProcedure('view')
      .input(getSummaryInputSchema)
      .query(({ input }) => {
        return getDashboardSummary(
          repository,
          input.companyId,
          input.summaryDate,
        )
      }),
    getOwnerSnapshot: capabilityProcedure('view_reports')
      .input(getOwnerSnapshotInputSchema)
      .query(({ input }) => {
        if (!ownerDeps) {
          throw new Error('Owner dashboard dependencies are not configured')
        }

        const asOfDate =
          input.asOfDate ?? new Date().toISOString().slice(0, 10)

        return getOwnerDashboardSnapshot(
          ownerDeps,
          input.companyId,
          asOfDate,
          input.companyStateCode,
        )
      }),
  }) satisfies TRPCRouterRecord
