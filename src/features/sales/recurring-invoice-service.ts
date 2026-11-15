import { DomainError } from '#/lib/domain-error.ts'

import { salesSeriesOptions } from '#/features/app-shell/data/india-masters.ts'

import type { TaxMode } from '#/features/accounting/voucher-math.ts'
import type {
  PaymentMode,
  PostSalesInvoiceInput,
  SalesInvoiceLineInput,
  SalesInvoiceRecord,
} from '#/features/sales/sales-invoice-service.ts'

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type RecurringStatus = 'active' | 'paused' | 'ended'

/** What each generated invoice copies from the source invoice. */
export type RecurringInvoiceTemplate = {
  series: string
  customerStateCode: string
  placeOfSupply: string
  reverseCharge: boolean
  paymentMode: PaymentMode
  taxMode: TaxMode
  narration: string
  freight: string
  packing: string
  roundOff: string
  billDiscount: string
  godownName: string | null
  poReference: string
  lines: Array<SalesInvoiceLineInput>
}

export type RecurringInvoiceRecord = {
  id: string
  companyId: string
  customerId: string
  customerName: string
  sourceInvoiceId: string
  frequency: RecurringFrequency
  startDate: string
  nextRunDate: string
  endDate: string | null
  /** Days from invoice date to due date. */
  dueDays: number
  status: RecurringStatus
  /** Total of the source invoice, for display. */
  totalAmount: string
  template: RecurringInvoiceTemplate
  lastInvoiceId: string | null
  lastInvoiceNumber: string
  generatedCount: number
  createdAt: Date
  updatedAt: Date
}

export interface RecurringInvoiceRepository {
  findById: (
    companyId: string,
    id: string,
  ) => Promise<RecurringInvoiceRecord | null>
  /** Row-locking read for read-modify-write inside a transaction. */
  lockById: (
    companyId: string,
    id: string,
  ) => Promise<RecurringInvoiceRecord | null>
  listByCompanyId: (companyId: string) => Promise<Array<RecurringInvoiceRecord>>
  save: (record: RecurringInvoiceRecord) => Promise<RecurringInvoiceRecord>
}

export class InvalidRecurringInvoiceError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidRecurringInvoiceError'
  }
}

/** Company details and ledgers the generated invoice is posted with. */
export type RecurringInvoiceContext = {
  company: {
    stateCode: string
    gstin: string | null
    addressLine1: string
    addressLine2: string
    city: string
    pincode: string
  }
  financialYearId: string | null
  ledgers: Partial<Record<string, string>>
}

export type RecurringPostInput = Omit<
  PostSalesInvoiceInput,
  'invoiceNumber'
> & {
  series: string
  financialYearId: string
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MONTHS: Record<Exclude<RecurringFrequency, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
}

function requireDate(value: string, label: string) {
  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(value))) {
    throw new InvalidRecurringInvoiceError(`${label} is not a valid date`)
  }
}

function toUtc(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function fromUtc(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const value = toUtc(date)
  value.setUTCDate(value.getUTCDate() + days)
  return fromUtc(value)
}

function daysBetween(from: string, to: string) {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000)
}

/**
 * The run after `current`. Monthly, quarterly and yearly runs keep the day of
 * the month of `anchor` (the start date), using the last day of shorter months.
 */
export function advanceRunDate(
  anchor: string,
  current: string,
  frequency: RecurringFrequency,
) {
  if (frequency === 'weekly') return addDays(current, 7)

  const anchorDay = toUtc(anchor).getUTCDate()
  const base = toUtc(current)
  const monthIndex = base.getUTCMonth() + MONTHS[frequency]
  const year = base.getUTCFullYear() + Math.floor(monthIndex / 12)
  const month = monthIndex % 12
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return fromUtc(new Date(Date.UTC(year, month, Math.min(anchorDay, lastDay))))
}

export function isRecurringDue(record: RecurringInvoiceRecord, today: string) {
  return record.status === 'active' && record.nextRunDate <= today
}

function seriesOf(invoiceNumber: string) {
  const prefix = invoiceNumber.slice(0, invoiceNumber.lastIndexOf('-'))
  return (salesSeriesOptions as ReadonlyArray<string>).includes(prefix)
    ? prefix
    : salesSeriesOptions[0]
}

export type CreateRecurringInvoiceInput = {
  companyId: string
  invoice: SalesInvoiceRecord
  frequency: RecurringFrequency
  startDate: string
  endDate?: string | null
}

export async function createRecurringInvoice(
  repository: RecurringInvoiceRepository,
  input: CreateRecurringInvoiceInput,
) {
  const { invoice } = input
  if (invoice.companyId !== input.companyId) {
    throw new InvalidRecurringInvoiceError('Invoice not found')
  }
  if (invoice.status === 'cancelled') {
    throw new InvalidRecurringInvoiceError('A cancelled invoice cannot repeat')
  }
  requireDate(input.startDate, 'Start date')
  const endDate = input.endDate?.trim() || null
  if (endDate) {
    requireDate(endDate, 'End date')
    if (endDate < input.startDate) {
      throw new InvalidRecurringInvoiceError(
        'End date must be on or after the start date',
      )
    }
  }

  const now = new Date()
  const record: RecurringInvoiceRecord = {
    id: crypto.randomUUID(),
    companyId: input.companyId,
    customerId: invoice.customerId,
    customerName: invoice.partyNameSnapshot,
    sourceInvoiceId: invoice.id,
    frequency: input.frequency,
    startDate: input.startDate,
    nextRunDate: input.startDate,
    endDate,
    dueDays: invoice.dueDate
      ? Math.max(0, daysBetween(invoice.invoiceDate, invoice.dueDate))
      : 0,
    status: 'active',
    totalAmount: invoice.totalAmount,
    template: {
      series: seriesOf(invoice.invoiceNumber),
      customerStateCode: invoice.placeOfSupply,
      placeOfSupply: invoice.placeOfSupply,
      reverseCharge: invoice.reverseCharge,
      paymentMode: invoice.paymentMode,
      taxMode: invoice.taxMode,
      narration: invoice.narration,
      freight: invoice.freight,
      packing: invoice.packing,
      roundOff: invoice.roundOff,
      billDiscount: invoice.billDiscount,
      godownName: invoice.godownName,
      poReference: invoice.poReference,
      lines: invoice.lines.map((line) => ({
        itemId: line.itemId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        rate: line.rate,
        gstRate: line.gstRate,
        discountPercent: line.discountPercent,
        godownName: line.godownName,
      })),
    },
    lastInvoiceId: null,
    lastInvoiceNumber: '',
    generatedCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  return repository.save(record)
}

export async function setRecurringStatus(
  repository: RecurringInvoiceRepository,
  input: { companyId: string; id: string; status: RecurringStatus },
) {
  const record = await repository.lockById(input.companyId, input.id)
  if (!record)
    throw new InvalidRecurringInvoiceError('Recurring invoice not found')
  if (record.status === 'ended') {
    throw new InvalidRecurringInvoiceError('This recurring invoice has ended')
  }
  return repository.save({
    ...record,
    status: input.status,
    updatedAt: new Date(),
  })
}

const REQUIRED_LEDGERS = [
  'sales',
  'output_gst',
  'customer_receivable',
  'cash',
] as const

export type GenerateRecurringInvoiceInput = {
  companyId: string
  recurringId: string
  /** Today's date in the company's time zone (YYYY-MM-DD). */
  today: string
  context: RecurringInvoiceContext
  /** Posts the invoice with its number, ledger, stock, summary and audit. */
  post: (input: RecurringPostInput) => Promise<SalesInvoiceRecord>
}

/** Posts the next due invoice of a recurring profile and moves its schedule on. */
export async function generateRecurringInvoice(
  repository: RecurringInvoiceRepository,
  input: GenerateRecurringInvoiceInput,
) {
  const record = await repository.lockById(input.companyId, input.recurringId)
  if (!record)
    throw new InvalidRecurringInvoiceError('Recurring invoice not found')
  if (record.status === 'ended') {
    throw new InvalidRecurringInvoiceError('This recurring invoice has ended')
  }
  if (record.status === 'paused') {
    throw new InvalidRecurringInvoiceError('This recurring invoice is paused')
  }
  if (record.nextRunDate > input.today) {
    throw new InvalidRecurringInvoiceError(
      `The next invoice is not due until ${record.nextRunDate}`,
    )
  }

  const { company, ledgers, financialYearId } = input.context
  for (const key of REQUIRED_LEDGERS) {
    if (!ledgers[key]) {
      throw new InvalidRecurringInvoiceError(`Missing ledger mapping: ${key}`)
    }
  }
  if (!financialYearId) {
    throw new InvalidRecurringInvoiceError(
      'No active financial year. Set one in Company settings.',
    )
  }

  const { template } = record
  const invoiceDate = record.nextRunDate
  const invoice = await input.post({
    companyId: record.companyId,
    companyStateCode: company.stateCode,
    companyGstin: company.gstin,
    companyAddressLine1: company.addressLine1,
    companyAddressLine2: company.addressLine2,
    companyCity: company.city,
    companyPincode: company.pincode,
    customerId: record.customerId,
    customerStateCode: template.customerStateCode,
    placeOfSupply: template.placeOfSupply,
    reverseCharge: template.reverseCharge,
    financialYearId,
    series: template.series,
    invoiceDate,
    dueDate: addDays(invoiceDate, record.dueDays),
    paymentMode: template.paymentMode,
    taxMode: template.taxMode,
    narration: template.narration,
    freight: template.freight,
    packing: template.packing,
    roundOff: template.roundOff,
    billDiscount: template.billDiscount,
    godownName: template.godownName,
    poReference: template.poReference,
    salesAccountId: ledgers.sales!,
    outputGstAccountId: ledgers.output_gst!,
    receivableAccountId: ledgers.customer_receivable!,
    cashAccountId: ledgers.cash!,
    cogsAccountId: ledgers.cogs,
    stockAccountId: ledgers.stock_in_hand,
    lines: template.lines.map((line) => ({ ...line })),
  })

  const nextRunDate = advanceRunDate(
    record.startDate,
    record.nextRunDate,
    record.frequency,
  )
  const ended = record.endDate !== null && nextRunDate > record.endDate
  const recurring = await repository.save({
    ...record,
    nextRunDate,
    status: ended ? 'ended' : record.status,
    lastInvoiceId: invoice.id,
    lastInvoiceNumber: invoice.invoiceNumber,
    generatedCount: record.generatedCount + 1,
    updatedAt: new Date(),
  })
  return { invoice, recurring }
}
