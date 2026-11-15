import { z } from 'zod'

import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import {
  listExpensesByCompany,
  postExpense,
} from '#/features/expenses/expense-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { PostingTransaction } from '#/features/accounting/posting-transaction.ts'
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
  gstRate: z.string().optional(),
  supplierName: z.string().optional(),
  supplierGstin: z.string().optional(),
  billNumber: z.string().optional(),
  claimItc: z.boolean().optional(),
})

export const createExpensesRouter = (deps: {
  transaction: PostingTransaction
  expenses: ExpenseRepository
  ledgers: Pick<LedgerAccountRepository, 'listByCompanyId'>
}) =>
  ({
    list: capabilityProcedure('view')
      .input(companyIdSchema)
      .query(({ input }) => {
        return listExpensesByCompany(deps.expenses, input.companyId)
      }),
    post: capabilityProcedure('post_voucher')
      .input(postExpenseInputSchema)
      .mutation(async ({ ctx, input }) => {
        const inputGstAccountId = input.claimItc
          ? (await deps.ledgers.listByCompanyId(input.companyId)).find(
              (account) => account.systemKey === 'input_gst',
            )?.id
          : undefined
        // The expense, its ledger entry and the audit event save together.
        return deps.transaction(async (tx) => {
          const expense = await postExpense(tx.expenses, tx.posting, {
            ...input,
            inputGstAccountId,
          })
          await recordDocumentEvent(tx.audit, {
            companyId: expense.companyId,
            actorUserId: ctx.userId,
            action: 'expense.posted',
            entityType: 'expense',
            entityId: expense.id,
            documentNumber: expense.narration,
            amount: expense.amount,
          })
          return expense
        })
      }),
  }) satisfies TRPCRouterRecord
