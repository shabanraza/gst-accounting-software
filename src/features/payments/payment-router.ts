import { z } from 'zod'

import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
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
      .mutation(({ ctx, input }) =>
        transaction(async (tx) => {
          const receipt = await allocateCustomerReceipt(tx, input)
          const invoice = await tx.invoices.findById(input.invoiceId)
          await recordDocumentEvent(tx.audit, {
            companyId: receipt.companyId,
            actorUserId: ctx.userId,
            action: 'receipt.posted',
            entityType: 'receipt',
            entityId: receipt.id,
            documentNumber: invoice?.invoiceNumber ?? '',
            amount: receipt.allocatedAmount,
          })
          return receipt
        }),
      ),
    allocateSupplierPayment: capabilityProcedure('post_payment')
      .input(supplierPaymentInputSchema)
      .mutation(({ ctx, input }) =>
        transaction(async (tx) => {
          const payment = await allocateSupplierPayment(tx, input)
          const bill = await tx.bills.findById(input.purchaseBillId)
          await recordDocumentEvent(tx.audit, {
            companyId: payment.companyId,
            actorUserId: ctx.userId,
            action: 'payment.posted',
            entityType: 'payment',
            entityId: payment.id,
            documentNumber: bill?.supplierBillNumber ?? '',
            amount: payment.allocatedAmount,
          })
          return payment
        }),
      ),
  }) satisfies TRPCRouterRecord
