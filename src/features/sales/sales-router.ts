import { z } from 'zod'

import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import { recordSalesSummary } from '#/features/dashboard/dashboard-summary-service.ts'
import {
  cancelSalesInvoice,
  postSalesInvoice,
} from '#/features/sales/sales-invoice-service.ts'
import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import {
  ShareSecretMissingError,
  shareTokenExpiry,
  signShareToken,
  verifyShareToken,
} from '#/features/documents/invoice-share-token.ts'
import {
  toPrintCompany,
  toPrintParty,
} from '#/features/documents/voucher-print-mappers.ts'
import { hashClientIp } from '#/features/marketing/submission-guards.ts'
import { buildInvoicePrintDocument } from '#/features/sales/invoice-print-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { publicProcedure } from '#/integrations/trpc/init.ts'
import { sendInvoiceEmail } from '#/lib/email.ts'

import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'
import type {
  PostingRepositories,
  PostingTransaction,
} from '#/features/accounting/posting-transaction.ts'
import type { CompanyRepository } from '#/features/companies/company-service.ts'
import type { VoucherPrintDocument } from '#/features/documents/voucher-print-types.ts'
import type {
  ItemRecord,
  ItemRepository,
} from '#/features/inventory/item-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type {
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'

/** What the public invoice link needs beyond the invoice repository. */
export type InvoiceSharingDependencies = {
  companies: Pick<CompanyRepository, 'listByIds'>
  parties: Pick<PartyRepository, 'findById'>
  items: Pick<ItemRepository, 'findById'>
  /** HMAC key for share tokens (`INVOICE_LINK_SECRET`). */
  getSecret: () => string | undefined
  /** Per-client brake on the unauthenticated read. */
  rateLimiter: { take: (key: string) => boolean }
}

export type PublicInvoiceResult =
  { status: 'active'; document: VoucherPrintDocument } | { status: 'cancelled' }

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
  invoiceNumber: z.string().min(1).optional(),
  financialYearId: z.string().uuid().optional(),
  series: z.string().min(1).optional(),
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
})

const shareLinkInputSchema = z.object({
  companyId: z.string().uuid(),
  id: z.string().uuid(),
})

const publicInvoiceInputSchema = z.object({
  token: z.string().max(128),
})

/** One answer for every bad link, so callers learn nothing about why. */
function linkNotFound() {
  return new TRPCError({
    code: 'NOT_FOUND',
    message: 'This invoice link is invalid or has expired.',
  })
}

function shareLinkPath(token: string) {
  return `/i/${token}`
}

/** Absolute origin for links sent by email; never taken from client input. */
function appOrigin(request: Request) {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/+$/, '') ||
    new URL(request.url).origin
  )
}

async function loadPublicInvoiceDocument(
  invoice: SalesInvoiceRecord,
  deps: InvoiceSharingDependencies,
): Promise<VoucherPrintDocument | null> {
  const companies = await deps.companies.listByIds([invoice.companyId])
  const company = companies.at(0)
  if (!company || company.id !== invoice.companyId) return null

  const customer = await deps.parties.findById(invoice.customerId)
  if (!customer || customer.companyId !== invoice.companyId) return null

  const itemIds = [...new Set(invoice.lines.map((line) => line.itemId))]
  const items = await Promise.all(
    itemIds.map((itemId) => deps.items.findById(itemId)),
  )
  const itemById = new Map<string, ItemRecord>()
  for (const item of items) {
    if (item && item.companyId === invoice.companyId) {
      itemById.set(item.id, item)
    }
  }

  return buildInvoicePrintDocument({
    invoice,
    company: toPrintCompany(company),
    customer: toPrintParty(customer),
    itemById,
  })
}

function allocateInvoiceNumber(
  tx: PostingRepositories,
  input: { companyId: string; financialYearId?: string; series?: string },
) {
  if (!input.financialYearId || !input.series) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'invoiceNumber or financialYearId and series is required',
    })
  }
  return nextDocumentNumber(tx.sequences, {
    companyId: input.companyId,
    financialYearId: input.financialYearId,
    voucherType: 'sales',
    series: input.series,
    padLength: 4,
  })
}

export const createSalesRouter = (
  invoices: SalesInvoiceRepository,
  transaction: PostingTransaction,
  sharing: InvoiceSharingDependencies,
) => {
  async function issueShareToken(invoice: SalesInvoiceRecord) {
    return signShareToken(
      {
        companyId: invoice.companyId,
        invoiceId: invoice.id,
        expiresAt: shareTokenExpiry(),
      },
      sharing.getSecret(),
    )
  }

  return {
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
      .mutation(({ ctx, input }) =>
        transaction(async (tx) => {
          const invoiceNumber =
            input.invoiceNumber ?? (await allocateInvoiceNumber(tx, input))
          const invoice = await postSalesInvoice(tx, {
            ...input,
            invoiceNumber,
          })
          const stockOutQuantity = invoice.lines
            .reduce((sum, line) => sum + Number(line.quantity), 0)
            .toFixed(0)

          await recordSalesSummary(tx.dashboard, {
            companyId: invoice.companyId,
            summaryDate: invoice.invoiceDate,
            salesAmount: invoice.totalAmount,
            receivableAmount: invoice.outstandingAmount,
            stockOutQuantity,
          })
          await recordDocumentEvent(tx.audit, {
            companyId: invoice.companyId,
            actorUserId: ctx.userId,
            action: 'sales_invoice.posted',
            entityType: 'sales_invoice',
            entityId: invoice.id,
            documentNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
          })

          return invoice
        }),
      ),
    cancelInvoice: capabilityProcedure('post_sales')
      .input(cancelSalesInvoiceInputSchema)
      .mutation(({ ctx, input }) =>
        transaction(async (tx) => {
          const invoice = await cancelSalesInvoice(tx, {
            companyId: input.companyId,
            invoiceId: input.id,
          })
          await recordDocumentEvent(tx.audit, {
            companyId: invoice.companyId,
            actorUserId: ctx.userId,
            action: 'sales_invoice.cancelled',
            entityType: 'sales_invoice',
            entityId: invoice.id,
            documentNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
          })
          return invoice
        }),
      ),
    emailInvoice: capabilityProcedure('post_sales')
      .input(emailInvoiceInputSchema)
      .mutation(async ({ ctx, input }) => {
        const invoice = await invoices.findById(input.id)
        if (!invoice || invoice.companyId !== input.companyId) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }

        let url: string | undefined
        if (invoice.status !== 'cancelled') {
          try {
            url = `${appOrigin(ctx.request)}${shareLinkPath(await issueShareToken(invoice))}`
          } catch (error) {
            if (!(error instanceof ShareSecretMissingError)) throw error
            console.error(`[sales] ${error.message}; emailing without a link`)
          }
        }

        await sendInvoiceEmail({
          to: input.toEmail,
          companyName: input.companyName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          amount: input.amount,
          url,
        })
        return { sent: true }
      }),
    shareLink: capabilityProcedure('view')
      .input(shareLinkInputSchema)
      .query(async ({ input }) => {
        const invoice = await invoices.findById(input.id)
        if (!invoice || invoice.companyId !== input.companyId) {
          throw new TRPCError({ code: 'NOT_FOUND' })
        }
        if (invoice.status === 'cancelled') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'A cancelled invoice cannot be shared',
          })
        }
        try {
          return { path: shareLinkPath(await issueShareToken(invoice)) }
        } catch (error) {
          if (error instanceof ShareSecretMissingError) {
            console.error(`[sales] ${error.message}`)
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Invoice links are not available right now',
            })
          }
          throw error
        }
      }),
    /**
     * The one unauthenticated read in the app: the customer-facing invoice
     * behind `/i/<token>`. The signed token names exactly one invoice; nothing
     * but its print model leaves the server, and only while it is not
     * cancelled.
     */
    publicInvoice: publicProcedure
      .input(publicInvoiceInputSchema)
      .query(async ({ ctx, input }): Promise<PublicInvoiceResult> => {
        const clientKey = (await hashClientIp(ctx.request)) ?? 'unknown'
        if (!sharing.rateLimiter.take(clientKey)) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests. Try again in a minute.',
          })
        }

        const claims = await verifyShareToken(input.token, sharing.getSecret())
        if (!claims) throw linkNotFound()

        const invoice = await invoices.findById(claims.invoiceId)
        if (!invoice || invoice.companyId !== claims.companyId) {
          throw linkNotFound()
        }
        if (invoice.status === 'cancelled') return { status: 'cancelled' }

        const document = await loadPublicInvoiceDocument(invoice, sharing)
        if (!document) throw linkNotFound()
        return { status: 'active', document }
      }),
  } satisfies TRPCRouterRecord
}
