import { z } from 'zod'

import {
  listExpensesByCompany,
  postExpense,
} from '#/features/expenses/expense-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
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
) =>
  ({
    list: publicProcedure.input(companyIdSchema).query(({ input }) => {
      return listExpensesByCompany(expenses, input.companyId)
    }),
    post: capabilityProcedure('post_voucher')
      .input(postExpenseInputSchema)
      .mutation(({ input }) => {
        return postExpense(expenses, posting, input)
      }),
  }) satisfies TRPCRouterRecord
