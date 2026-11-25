import { z } from 'zod'

import {
  buildInvoiceProfit,
  buildItemSales,
  buildPartySales,
} from '#/features/reports-analysis/sales-analysis-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { SalesAnalysisRepository } from '#/features/reports-analysis/sales-analysis-store.ts'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const periodInputSchema = z
  .object({
    companyId: z.string().uuid(),
    from: isoDate,
    to: isoDate,
  })
  .refine((input) => input.from <= input.to, {
    message: 'The period must end on or after its start date',
    path: ['to'],
  })

export const createSalesAnalysisRouter = (
  repository: SalesAnalysisRepository,
) => {
  const report = <T>(
    build: (
      data: Awaited<ReturnType<SalesAnalysisRepository['loadPeriod']>>,
    ) => T,
  ) =>
    capabilityProcedure('view_reports')
      .input(periodInputSchema)
      .query(async ({ input }) =>
        build(
          await repository.loadPeriod({
            companyId: input.companyId,
            from: input.from,
            to: input.to,
          }),
        ),
      )

  return {
    itemSales: report(buildItemSales),
    partySales: report(buildPartySales),
    invoiceProfit: report(buildInvoiceProfit),
  } satisfies TRPCRouterRecord
}
