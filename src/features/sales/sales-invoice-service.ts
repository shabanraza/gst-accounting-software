import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { calculateGst } from '#/features/gst/gst-calculator.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'

import type { TaxMode } from '#/features/accounting/voucher-math.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'

export type PaymentMode = 'credit' | 'cash'
export type PaymentStatus = 'Paid' | 'Part paid' | 'Pending'
export type SalesInvoiceStatus = 'posted' | 'cancelled'

export type SalesInvoiceLineInput = {
  itemId: string
  description: string
  quantity: string
  unit: string
  rate: string
  gstRate: string
  discountPercent?: string
  godownName?: string | null
}

export type PostSalesInvoiceInput = {
  companyId: string
  companyStateCode: string
  customerId: string
  customerStateCode: string
  invoiceNumber: string
  invoiceDate: string
  placeOfSupply?: string
  reverseCharge?: boolean
  paymentMode: PaymentMode
  taxMode?: TaxMode
  narration?: string
  freight?: string
  packing?: string
  roundOff?: string
  billDiscount?: string
  godownName?: string | null
  salesAccountId: string
  outputGstAccountId: string
  receivableAccountId: string
  cashAccountId: string
  cogsAccountId?: string
  stockAccountId?: string
  lines: Array<SalesInvoiceLineInput>
}

export type SalesInvoiceLineRecord = SalesInvoiceLineInput & {
  id: string
  discountPercent: string
  discountAmount: string
  taxableAmount: string
  gstAmount: string
  lineTotal: string
  godownName: string | null
}

export type SalesInvoiceRecord = {
  id: string
  companyId: string
  customerId: string
  invoiceNumber: string
  invoiceDate: string
  placeOfSupply: string
  reverseCharge: boolean
  paymentMode: PaymentMode
  paymentStatus: PaymentStatus
  taxMode: TaxMode
  narration: string
  freight: string
  packing: string
  roundOff: string
  billDiscount: string
  godownName: string | null
  status: SalesInvoiceStatus
  taxableAmount: string
  totalGstAmount: string
  totalAmount: string
  outstandingAmount: string
  ledgerEntryId: string
  lines: Array<SalesInvoiceLineRecord>
  createdAt: Date
}

export interface SalesInvoiceRepository {
  create: (invoice: SalesInvoiceRecord) => Promise<SalesInvoiceRecord>
  findById: (id: string) => Promise<SalesInvoiceRecord | null>
  save: (invoice: SalesInvoiceRecord) => Promise<SalesInvoiceRecord>
  listByCompanyId: (companyId: string) => Promise<Array<SalesInvoiceRecord>>
}

export type SalesInvoiceDependencies = {
  invoices: SalesInvoiceRepository
  posting: LedgerPostingRepository
  stock: StockMovementRepository & StockBalanceRepository
  parties?: PartyRepository
}

export class CreditLimitExceededError extends Error {
  constructor(customerName: string, limit: string, projected: string) {
    super(
      `Credit limit exceeded for ${customerName}: limit ${limit}, projected outstanding ${projected}`,
    )
    this.name = 'CreditLimitExceededError'
  }
}

async function projectedCustomerOutstanding(
  invoices: SalesInvoiceRepository,
  companyId: string,
  customerId: string,
  additional: Decimal,
) {
  const existing = await invoices.listByCompanyId(companyId)
  const current = existing
    .filter(
      (invoice) =>
        invoice.customerId === customerId &&
        invoice.status !== 'cancelled' &&
        invoice.paymentMode === 'credit',
    )
    .reduce((sum, invoice) => sum.plus(invoice.outstandingAmount), new Decimal(0))

  return current.plus(additional)
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function money(value: string) {
  return new Decimal(value || '0')
}

function formatMoney(value: Decimal) {
  return value.toFixed(2)
}

export async function postSalesInvoice(
  deps: SalesInvoiceDependencies,
  input: PostSalesInvoiceInput,
): Promise<SalesInvoiceRecord> {
  const taxMode = input.taxMode ?? 'exclusive'
  let taxableTotal = new Decimal(0)
  let gstTotal = new Decimal(0)
  let cogsTotal = new Decimal(0)

  const lines: Array<SalesInvoiceLineRecord> = input.lines.map((line) => {
    const discountPercent = money(line.discountPercent ?? '0')
    const gross = money(line.quantity).mul(money(line.rate))
    const discountAmount = gross.mul(discountPercent).div(100)
    const net = Decimal.max(gross.minus(discountAmount), new Decimal(0))
    const gstRate = money(line.gstRate)

    let taxableAmount = net
    if (taxMode === 'inclusive' && gstRate.gt(0)) {
      taxableAmount = net.mul(100).div(gstRate.plus(100))
    }

    const gst = calculateGst({
      taxableAmount: formatMoney(taxableAmount),
      gstRate: line.gstRate,
      companyStateCode: input.companyStateCode,
      partyStateCode: input.customerStateCode,
    })

    taxableTotal = taxableTotal.plus(money(gst.taxableAmount))
    gstTotal = gstTotal.plus(money(gst.totalGstAmount))

    return {
      ...line,
      id: crypto.randomUUID(),
      discountPercent: formatMoney(discountPercent),
      discountAmount: formatMoney(discountAmount),
      taxableAmount: gst.taxableAmount,
      gstAmount: gst.totalGstAmount,
      lineTotal: taxMode === 'inclusive' ? formatMoney(net) : gst.totalAmount,
      godownName: line.godownName ?? input.godownName ?? null,
    }
  })

  const freight = money(input.freight ?? '0')
  const packing = money(input.packing ?? '0')
  const roundOff = money(input.roundOff ?? '0')
  const billDiscount = money(input.billDiscount ?? '0')
  const sundryNet = freight.plus(packing).plus(roundOff).minus(billDiscount)
  const totalAmount = taxableTotal.plus(gstTotal).plus(sundryNet)
  const invoiceId = crypto.randomUUID()
  const isCash = input.paymentMode === 'cash'

  if (!isCash && deps.parties) {
    const partyList = await deps.parties.listByCompanyId(input.companyId)
    const customer = partyList.find((party) => party.id === input.customerId)
    if (customer?.creditLimit) {
      const limit = new Decimal(customer.creditLimit)
      if (limit.gt(0)) {
        const projected = await projectedCustomerOutstanding(
          deps.invoices,
          input.companyId,
          input.customerId,
          totalAmount,
        )
        if (projected.gt(limit)) {
          throw new CreditLimitExceededError(
            customer.name,
            limit.toFixed(2),
            projected.toFixed(2),
          )
        }
      }
    }
  }

  const settlementAccountId = isCash
    ? input.cashAccountId
    : input.receivableAccountId

  const ledgerLines = [
    {
      ledgerAccountId: settlementAccountId,
      debit: formatMoney(totalAmount),
      credit: '0.00',
    },
    {
      ledgerAccountId: input.salesAccountId,
      debit: '0.00',
      credit: formatMoney(taxableTotal.plus(sundryNet)),
    },
    {
      ledgerAccountId: input.outputGstAccountId,
      debit: '0.00',
      credit: formatMoney(gstTotal),
    },
  ]

  if (input.cogsAccountId && input.stockAccountId) {
    cogsTotal = taxableTotal
    ledgerLines.push(
      {
        ledgerAccountId: input.cogsAccountId,
        debit: formatMoney(cogsTotal),
        credit: '0.00',
      },
      {
        ledgerAccountId: input.stockAccountId,
        debit: '0.00',
        credit: formatMoney(cogsTotal),
      },
    )
  }

  const ledgerEntry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.invoiceDate,
    narration:
      input.narration?.trim() || `Sales invoice ${input.invoiceNumber}`,
    voucherType: 'sales',
    lines: ledgerLines,
  })

  for (const line of lines) {
    await recordStockMovement(deps.stock, deps.stock, {
      companyId: input.companyId,
      itemId: line.itemId,
      movementType: 'sale_out',
      quantity: line.quantity,
      unit: line.unit,
      referenceType: 'sales_invoice',
      referenceId: invoiceId,
      occurredOn: input.invoiceDate,
      godownName: line.godownName,
    })
  }

  const invoice: SalesInvoiceRecord = {
    id: invoiceId,
    companyId: input.companyId,
    customerId: input.customerId,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: input.invoiceDate,
    placeOfSupply: input.placeOfSupply ?? input.customerStateCode,
    reverseCharge: input.reverseCharge ?? false,
    paymentMode: input.paymentMode,
    paymentStatus: isCash ? 'Paid' : 'Pending',
    taxMode,
    narration: input.narration?.trim() || '',
    freight: formatMoney(freight),
    packing: formatMoney(packing),
    roundOff: formatMoney(roundOff),
    billDiscount: formatMoney(billDiscount),
    godownName: input.godownName ?? null,
    status: 'posted',
    taxableAmount: formatMoney(taxableTotal),
    totalGstAmount: formatMoney(gstTotal),
    totalAmount: formatMoney(totalAmount),
    outstandingAmount: isCash ? '0.00' : formatMoney(totalAmount),
    ledgerEntryId: ledgerEntry.id,
    lines,
    createdAt: new Date(),
  }

  return deps.invoices.create(invoice)
}

export class InvoiceAlreadyCancelledError extends Error {
  constructor(invoiceNumber: string) {
    super(`Sales invoice ${invoiceNumber} is already cancelled`)
    this.name = 'InvoiceAlreadyCancelledError'
  }
}

export async function cancelSalesInvoice(
  invoices: SalesInvoiceRepository,
  invoiceId: string,
): Promise<SalesInvoiceRecord> {
  const invoice = await invoices.findById(invoiceId)

  if (!invoice) {
    throw new Error(`Sales invoice not found: ${invoiceId}`)
  }

  if (invoice.status === 'cancelled') {
    throw new InvoiceAlreadyCancelledError(invoice.invoiceNumber)
  }

  return invoices.save({ ...invoice, status: 'cancelled' })
}
