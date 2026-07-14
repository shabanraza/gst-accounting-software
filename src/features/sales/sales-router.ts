import { z } from 'zod'

import { recordSalesSummary } from '#/features/dashboard/dashboard-summary-service.ts'
import { ensureInventoryOpeningStock } from '#/features/inventory/opening-stock.ts'
import {
  cancelSalesInvoice,
  postSalesInvoice,
} from '#/features/sales/sales-invoice-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { sendInvoiceEmail } from '#/lib/email.ts'

import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { DashboardSummaryRepository } from '#/features/dashboard/dashboard-summary-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

const lineSchema = z.object({
  itemId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.string().min(1),
  unit: z.string().min(1),
  rate: z.string().min(1),
  gstRate: z.string().min(1),
  discountPercent: z.string().optional(),
  godownName: z.string().nullable().optional(),
})

const optionalStateCodeSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().length(2).optional(),
)

const postSalesInvoiceInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  companyGstin: z.string().nullable().optional(),
  companyAddressLine1: z.string().optional(),
  companyAddressLine2: z.string().optional(),
  companyCity: z.string().optional(),
  companyPincode: z.string().optional(),
  customerId: z.string().uuid(),
  customerStateCode: z.string().trim().length(2),
  placeOfSupply: optionalStateCodeSchema,
  reverseCharge: z.boolean().optional(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().min(1),
  paymentMode: z.enum(['credit', 'cash']),
  taxMode: z.enum(['exclusive', 'inclusive']).optional(),
  narration: z.string().optional(),
  freight: z.string().optional(),
  packing: z.string().optional(),
  roundOff: z.string().optional(),
  billDiscount: z.string().optional(),
  godownName: z.string().nullable().optional(),
  dueDate: z.string().optional(),
  poReference: z.string().optional(),
  transportMode: z.string().optional(),
  vehicleNo: z.string().optional(),
  lrNumber: z.string().optional(),
  challanRef: z.string().optional(),
  salesAccountId: z.string().uuid(),
  outputGstAccountId: z.string().uuid(),
  receivableAccountId: z.string().uuid(),
  cashAccountId: z.string().uuid(),
  cogsAccountId: z.string().uuid().optional(),
  stockAccountId: z.string().uuid().optional(),
  lines: z.array(lineSchema).min(1),
})

const listSalesInputSchema = z.object({
  companyId: z.string().uuid(),
  includeLines: z.boolean().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  partyId: z.string().uuid().optional(),
  paymentStatus: z.enum(['Paid', 'Part paid', 'Pending']).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
  cursor: z.string().optional(),
})

const getSalesInvoiceInputSchema = z.object({
  companyId: z.string().uuid(),
  id: z.string().uuid(),
})

const cancelSalesInvoiceInputSchema = z.object({
  companyId: z.string().uuid(),
  id: z.string().uuid(),
})

const emailInvoiceInputSchema = z.object({
  companyId: z.string().uuid(),
  id: z.string().uuid(),
  toEmail: z.string().email(),
  companyName: z.string().min(1),
  amount: z.string().min(1),
  url: z.string().optional(),
})

export const createSalesRouter = (
  invoices: SalesInvoiceRepository,
  posting: LedgerPostingRepository,
  stock: StockMovementRepository & StockBalanceRepository,
  dashboard: DashboardSummaryRepository,
  parties: PartyRepository,
  items: ItemRepository,
) =>
  ({
    list: capabilityProcedure('view')
      .input(listSalesInputSchema)
      .query(({ input }) => {
        return invoices.listByCompanyId(input.companyId, {
          includeLines: input.includeLines ?? false,
          startDate: input.startDate,
          endDate: input.endDate,
          partyId: input.partyId,
          paymentStatus: input.paymentStatus,
          search: input.search,
          limit: input.limit,
          cursor: input.cursor,
        })
      }),
    getById: capabilityProcedure('view')
      .input(getSalesInvoiceInputSchema)
      .query(async ({ input }) => {
        const invoice = await invoices.findById(input.id)
        if (!invoice || invoice.companyId !== input.companyId) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
        return invoice
      }),
    postInvoice: capabilityProcedure('post_sales')
      .input(postSalesInvoiceInputSchema)
      .mutation(async ({ input }) => {
        await ensureInventoryOpeningStock(items, stock, {
          companyId: input.companyId,
          occurredOn: input.invoiceDate,
        })

        const invoice = await postSalesInvoice(
          { invoices, posting, stock, items, parties },
          input,
        )
        const stockOutQuantity = invoice.lines
          .reduce((sum, line) => sum + Number(line.quantity), 0)
          .toFixed(0)

        await recordSalesSummary(dashboard, {
          companyId: invoice.companyId,
          summaryDate: invoice.invoiceDate,
          salesAmount: invoice.totalAmount,
          receivableAmount: invoice.outstandingAmount,
          stockOutQuantity,
        })

        return invoice
      }),
    cancelInvoice: capabilityProcedure('post_sales')
      .input(cancelSalesInvoiceInputSchema)
      .mutation(({ input }) => {
        return cancelSalesInvoice(
          { invoices, posting, stock, items, dashboard },
          { companyId: input.companyId, invoiceId: input.id },
        )
      }),
    emailInvoice: capabilityProcedure('post_sales')
      .input(emailInvoiceInputSchema)
      .mutation(async ({ input }) => {
        const invoice = await invoices.findById(input.id)
        if (!invoice || invoice.companyId !== input.companyId) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
        await sendInvoiceEmail({
          to: input.toEmail,
          companyName: input.companyName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          amount: input.amount,
          url: input.url,
        })
        return { sent: true }
      }),
  }) satisfies TRPCRouterRecord
