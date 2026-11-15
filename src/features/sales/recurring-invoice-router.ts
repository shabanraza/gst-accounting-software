import { z } from 'zod'

import { listLedgerAccountsByCompany } from '#/features/accounting/chart-of-accounts.ts'
import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import {
  InvalidRecurringInvoiceError,
  createRecurringInvoice,
  generateRecurringInvoice,
  setRecurringStatus,
} from '#/features/sales/recurring-invoice-service.ts'
import { postSalesInvoiceWithEffects } from '#/features/sales/sales-router.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { PostingTransaction } from '#/features/accounting/posting-transaction.ts'
import type { CompanyRepository } from '#/features/companies/company-service.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type {
  RecurringInvoiceContext,
  RecurringInvoiceRepository,
} from '#/features/sales/recurring-invoice-service.ts'

export type RecurringInvoicesRouterDeps = {
  transaction: PostingTransaction
  recurring: RecurringInvoiceRepository
  companies: Pick<CompanyRepository, 'listByIds'>
  ledgers: LedgerAccountRepository
  financialYears: FinancialYearRepository
  /** Today's date in India (YYYY-MM-DD); injectable for tests. */
  today?: () => string
}

const frequencySchema = z.enum(['weekly', 'monthly', 'quarterly', 'yearly'])
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function indiaToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    new Date(),
  )
}

function badRequest(error: unknown): never {
  if (error instanceof InvalidRecurringInvoiceError) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: error.message })
  }
  throw error
}

export function createRecurringInvoicesRouter(
  deps: RecurringInvoicesRouterDeps,
) {
  const today = deps.today ?? indiaToday

  async function loadContext(
    companyId: string,
  ): Promise<RecurringInvoiceContext> {
    const company = (await deps.companies.listByIds([companyId])).at(0)
    if (!company || company.id !== companyId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' })
    }
    const ledgers = await listLedgerAccountsByCompany(deps.ledgers, companyId)
    const financialYears = await deps.financialYears.listByCompanyId(companyId)
    const activeYear =
      financialYears.find((entry) => entry.isActive) ?? financialYears.at(0)
    return {
      company: {
        stateCode: company.stateCode,
        gstin: company.gstin,
        addressLine1: company.addressLine1,
        addressLine2: company.addressLine2,
        city: company.city,
        pincode: company.pincode,
      },
      financialYearId: activeYear?.id ?? null,
      ledgers: Object.fromEntries(
        ledgers
          .filter((ledger) => ledger.systemKey)
          .map((ledger) => [ledger.systemKey, ledger.id]),
      ),
    }
  }

  return {
    list: capabilityProcedure('view')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(async ({ input }) => {
        const records = await deps.recurring.listByCompanyId(input.companyId)
        return { today: today(), records }
      }),
    create: capabilityProcedure('post_sales')
      .input(
        z.object({
          companyId: z.string().uuid(),
          invoiceId: z.string().uuid(),
          frequency: frequencySchema,
          startDate: dateSchema,
          endDate: dateSchema.nullable().optional(),
        }),
      )
      .mutation(({ ctx, input }) =>
        deps
          .transaction(async (tx) => {
            const invoice = await tx.invoices.findById(input.invoiceId)
            if (!invoice || invoice.companyId !== input.companyId) {
              throw new TRPCError({ code: 'NOT_FOUND' })
            }
            const recurring = await createRecurringInvoice(
              tx.recurringInvoices,
              {
                companyId: input.companyId,
                invoice,
                frequency: input.frequency,
                startDate: input.startDate,
                endDate: input.endDate,
              },
            )
            await recordDocumentEvent(tx.audit, {
              companyId: input.companyId,
              actorUserId: ctx.userId,
              action: 'recurring_invoice.created',
              entityType: 'recurring_invoice',
              entityId: recurring.id,
              documentNumber: invoice.invoiceNumber,
              amount: recurring.totalAmount,
            })
            return recurring
          })
          .catch(badRequest),
      ),
    setStatus: capabilityProcedure('post_sales')
      .input(
        z.object({
          companyId: z.string().uuid(),
          id: z.string().uuid(),
          status: z.enum(['active', 'paused', 'ended']),
        }),
      )
      .mutation(({ input }) =>
        deps
          .transaction((tx) =>
            setRecurringStatus(tx.recurringInvoices, {
              companyId: input.companyId,
              id: input.id,
              status: input.status,
            }),
          )
          .catch(badRequest),
      ),
    generate: capabilityProcedure('post_sales')
      .input(z.object({ companyId: z.string().uuid(), id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const context = await loadContext(input.companyId)
        return deps
          .transaction((tx) =>
            generateRecurringInvoice(tx.recurringInvoices, {
              companyId: input.companyId,
              recurringId: input.id,
              today: today(),
              context,
              post: (postInput) =>
                postSalesInvoiceWithEffects(tx, postInput, ctx.userId),
            }),
          )
          .catch(badRequest)
      }),
  } satisfies TRPCRouterRecord
}
