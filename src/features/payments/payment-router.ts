import { z } from 'zod'

import {
  allocateCustomerReceipt,
  allocateSupplierPayment,
} from '#/features/payments/payment-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { PostingTransaction } from '#/features/accounting/posting-transaction.ts'

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

export const createPaymentsRouter = (transaction: PostingTransaction) =>
  ({
    allocateCustomerReceipt: capabilityProcedure('post_payment')
      .input(customerReceiptInputSchema)
      .mutation(({ input }) =>
        transaction((tx) => allocateCustomerReceipt(tx, input)),
      ),
    allocateSupplierPayment: capabilityProcedure('post_payment')
      .input(supplierPaymentInputSchema)
      .mutation(({ input }) =>
        transaction((tx) => allocateSupplierPayment(tx, input)),
      ),
  }) satisfies TRPCRouterRecord
