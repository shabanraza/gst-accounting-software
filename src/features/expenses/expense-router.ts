import { z } from 'zod'

import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import {
  listExpensesByCompany,
  postExpense,
} from '#/features/expenses/expense-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'
import type { ExpenseRepository } from '#/features/expenses/expense-service.ts'

const companyIdSchema = z.object({
  companyId: z.string().uuid(),
})

const postExpenseInputSchema = z.object({
  companyId: z.string().uuid(),
  expenseDate: z.string().min(1),
  narration: z.string().min(1),
  amount: z.string().min(1),
  expenseAccountId: z.string().uuid(),
  paymentAccountId: z.string().uuid(),
})

export const createExpensesRouter = (
  expenses: ExpenseRepository,
  posting: LedgerPostingRepository,
  audit: AuditLogRepository,
) =>
  ({
    list: capabilityProcedure('view').input(companyIdSchema).query(({ input }) => {
      return listExpensesByCompany(expenses, input.companyId)
    }),
    post: capabilityProcedure('post_voucher')
      .input(postExpenseInputSchema)
      .mutation(async ({ ctx, input }) => {
        const expense = await postExpense(expenses, posting, input)
        await recordDocumentEvent(audit, {
          companyId: expense.companyId,
          actorUserId: ctx.userId,
          action: 'expense.posted',
          entityType: 'expense',
          entityId: expense.id,
          documentNumber: expense.narration,
          amount: expense.amount,
        })
        return expense
      }),
  }) satisfies TRPCRouterRecord
