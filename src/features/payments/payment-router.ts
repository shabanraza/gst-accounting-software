import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  applyVoucherAdvance,
  cancelPaymentVoucher,
  paymentVoucherForBill,
  postPaymentVoucher,
  receiptVoucherForInvoice,
} from '#/features/payments/payment-voucher-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type {
  PostingRepositories,
  PostingTransaction,
} from '#/features/accounting/posting-transaction.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type {
  PaymentVoucherDependencies,
  PaymentVoucherRepository,
} from '#/features/payments/payment-voucher-service.ts'

const amountSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount')

const customerReceiptInputSchema = z.object({
  companyId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: z.string().min(1),
  receiptDate: z.string().min(1),
  cashAccountId: z.string().uuid(),
  receivableAccountId: z.string().uuid(),
})

const supplierPaymentInputSchema = z.object({
  companyId: z.string().uuid(),
  purchaseBillId: z.string().uuid(),
  amount: z.string().min(1),
  paymentDate: z.string().min(1),
  cashAccountId: z.string().uuid(),
  payableAccountId: z.string().uuid(),
})

const allocationSchema = z.object({
  documentId: z.string().uuid(),
  amount: amountSchema,
})

const postVoucherInputSchema = z.object({
  companyId: z.string().uuid(),
  kind: z.enum(['receipt', 'payment']),
  partyId: z.string().uuid(),
  voucherDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(['cash', 'bank', 'upi', 'cheque']),
  cashBankAccountId: z.string().uuid(),
  reference: z.string().trim().max(80).optional(),
  amount: amountSchema,
  narration: z.string().trim().max(500).optional(),
  allocations: z.array(allocationSchema).max(200),
})

const listInputSchema = z.object({
  companyId: z.string().uuid(),
  kind: z.enum(['receipt', 'payment']).optional(),
  partyId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

const voucherIdInputSchema = z.object({
  companyId: z.string().uuid(),
  id: z.string().uuid(),
})

const applyAdvanceInputSchema = z.object({
  companyId: z.string().uuid(),
  id: z.string().uuid(),
  allocations: z.array(allocationSchema).min(1).max(200),
})

export type PaymentsRouterDependencies = {
  transaction: PostingTransaction
  vouchers: PaymentVoucherRepository
  ledgers: LedgerAccountRepository
  financialYears: FinancialYearRepository
}

export const createPaymentsRouter = (deps: PaymentsRouterDependencies) => {
  const withDeps = (tx: PostingRepositories): PaymentVoucherDependencies => ({
    ...tx,
    ledgers: deps.ledgers,
    financialYears: deps.financialYears,
  })

  return {
    list: capabilityProcedure('view')
      .input(listInputSchema)
      .query(({ input }) =>
        deps.vouchers.listByCompanyId(input.companyId, {
          kind: input.kind,
          partyId: input.partyId,
          startDate: input.startDate,
          endDate: input.endDate,
        }),
      ),
    getById: capabilityProcedure('view')
      .input(voucherIdInputSchema)
      .query(async ({ input }) => {
        const voucher = await deps.vouchers.findById(input.companyId, input.id)
        if (!voucher) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Voucher not found',
          })
        }
        return voucher
      }),
    post: capabilityProcedure('post_payment')
      .input(postVoucherInputSchema)
      .mutation(({ input }) =>
        deps.transaction((tx) => postPaymentVoucher(withDeps(tx), input)),
      ),
    applyAdvance: capabilityProcedure('post_payment')
      .input(applyAdvanceInputSchema)
      .mutation(({ input }) =>
        deps.transaction((tx) =>
          applyVoucherAdvance(withDeps(tx), {
            companyId: input.companyId,
            voucherId: input.id,
            allocations: input.allocations,
          }),
        ),
      ),
    cancel: capabilityProcedure('post_payment')
      .input(voucherIdInputSchema)
      .mutation(({ input }) =>
        deps.transaction((tx) =>
          cancelPaymentVoucher(withDeps(tx), {
            companyId: input.companyId,
            voucherId: input.id,
          }),
        ),
      ),
    // Single-bill cash endpoints kept for the mobile app; both now save a
    // numbered voucher.
    allocateCustomerReceipt: capabilityProcedure('post_payment')
      .input(customerReceiptInputSchema)
      .mutation(({ input }) =>
        deps.transaction((tx) => receiptVoucherForInvoice(withDeps(tx), input)),
      ),
    allocateSupplierPayment: capabilityProcedure('post_payment')
      .input(supplierPaymentInputSchema)
      .mutation(({ input }) =>
        deps.transaction((tx) => paymentVoucherForBill(withDeps(tx), input)),
      ),
  } satisfies TRPCRouterRecord
}
