import Decimal from 'decimal.js'

import { indianStates } from '#/features/app-shell/data/india-masters.ts'

import type { LedgerAccountRecord } from '#/features/accounting/chart-of-accounts.ts'
import type {
  LedgerEntryRecord,
  LedgerLineRecord,
} from '#/features/accounting/posting-engine.ts'
import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'
import type {
  PurchaseBillLineRecord,
  PurchaseBillRecord,
} from '#/features/purchases/purchase-bill-service.ts'
import type { CreditDebitNoteRecord } from '#/features/returns/credit-debit-note-service.ts'
import type {
  SalesInvoiceLineRecord,
  SalesInvoiceRecord,
} from '#/features/sales/sales-invoice-service.ts'

type DocumentLine = Pick<
  SalesInvoiceLineRecord & PurchaseBillLineRecord,
  | 'itemId'
  | 'description'
  | 'quantity'
  | 'unit'
  | 'rate'
  | 'discountPercent'
  | 'taxableAmount'
>

export type TallyExportInput = {
  companyStateCode: string
  /** Inclusive YYYY-MM-DD bounds for vouchers. Masters are always complete. */
  from: string
  to: string
  ledgers: Array<
    Pick<LedgerAccountRecord, 'id' | 'name' | 'accountType' | 'systemKey'>
  >
  parties: Array<
    Pick<
      PartyRecord,
      | 'id'
      | 'name'
      | 'partyType'
      | 'gstin'
      | 'stateCode'
      | 'addressLine1'
      | 'addressLine2'
      | 'city'
      | 'pincode'
    >
  >
  items: Array<
    Pick<ItemRecord, 'id' | 'name' | 'hsnCode' | 'gstRate' | 'baseUnit'>
  >
  entries: Array<
    Pick<
      LedgerEntryRecord,
      'id' | 'entryDate' | 'narration' | 'voucherType'
    > & {
      lines: Array<
        Pick<LedgerLineRecord, 'ledgerAccountId' | 'debit' | 'credit'>
      >
    }
  >
  invoices: Array<
    Pick<
      SalesInvoiceRecord,
      | 'customerId'
      | 'invoiceNumber'
      | 'invoiceDate'
      | 'placeOfSupply'
      | 'paymentMode'
      | 'status'
      | 'narration'
      | 'totalGstAmount'
      | 'totalAmount'
      | 'partyNameSnapshot'
    > & { lines: Array<DocumentLine> }
  >
  bills: Array<
    Pick<
      PurchaseBillRecord,
      | 'supplierId'
      | 'supplierBillNumber'
      | 'billDate'
      | 'placeOfSupply'
      | 'narration'
      | 'totalGstAmount'
      | 'totalAmount'
      | 'partyNameSnapshot'
    > & { lines: Array<DocumentLine> }
  >
  notes: Array<
    Pick<
      CreditDebitNoteRecord,
      | 'noteType'
      | 'noteNumber'
      | 'noteDate'
      | 'partyId'
      | 'totalGstAmount'
      | 'totalAmount'
      | 'ledgerEntryId'
      | 'narration'
    >
  >
}

export type TallyExport = {
  /** Import first, through Import → Masters. */
  masters: string
  /** Then Import → Transactions. */
  vouchers: string
  voucherCount: number
}

// Tally's reserved groups. The importer reads parties back from the
// Sundry Debtors and Sundry Creditors groups.
const SUNDRY_DEBTORS = 'Sundry Debtors'
const SUNDRY_CREDITORS = 'Sundry Creditors'
const DUTIES_AND_TAXES = 'Duties & Taxes'

const GROUP_BY_SYSTEM_KEY: Record<
  NonNullable<LedgerAccountRecord['systemKey']>,
  string
> = {
  cash: 'Cash-in-Hand',
  bank: 'Bank Accounts',
  customer_receivable: 'Current Assets',
  supplier_payable: 'Current Liabilities',
  input_gst: DUTIES_AND_TAXES,
  output_gst: DUTIES_AND_TAXES,
  stock_in_hand: 'Current Assets',
  opening_balance: 'Capital Account',
  sales: 'Sales Accounts',
  purchase: 'Purchase Accounts',
  expenses: 'Indirect Expenses',
  cogs: 'Direct Expenses',
}

const GROUP_BY_ACCOUNT_TYPE: Record<
  LedgerAccountRecord['accountType'],
  string
> = {
  asset: 'Current Assets',
  liability: 'Current Liabilities',
  equity: 'Capital Account',
  income: 'Indirect Incomes',
  expense: 'Indirect Expenses',
}

const GST_HEADS = [
  { head: 'CGST', dutyHead: 'Central Tax' },
  { head: 'SGST', dutyHead: 'State Tax' },
  { head: 'IGST', dutyHead: 'Integrated Tax' },
] as const

type GstHead = (typeof GST_HEADS)[number]['head']

const VOUCHER_TYPE_NAMES = {
  receipt: 'Receipt',
  payment: 'Payment',
  contra: 'Contra',
  journal: 'Journal',
} as const

// Tally writes reserved names such as "Any" with a leading U+0004.
const RESERVED_ANY = '&#4; Any'

const STATE_NAME_BY_CODE = new Map<string, string>(
  indianStates.map((state) => [state.code, state.name]),
)

/** Escapes text for element content and attribute values. */
export function escapeXml(value: string): string {
  return (
    value
      // XML 1.0 forbids most control characters, escaped or not.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  )
}

function tag(name: string, value: string): string {
  return `<${name}>${escapeXml(value)}</${name}>`
}

function money(value: string): Decimal {
  return new Decimal(value || '0')
}

function tallyDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

/**
 * Tally's sign convention: debits are negative with ISDEEMEDPOSITIVE=Yes,
 * credits positive with ISDEEMEDPOSITIVE=No. `debit` is positive for a debit.
 */
function amountTags(debit: Decimal): string {
  return (
    tag('ISDEEMEDPOSITIVE', debit.gt(0) ? 'Yes' : 'No') +
    tag('AMOUNT', debit.negated().toFixed(2))
  )
}

function envelope(reportName: string, messages: Array<string>): string {
  const body = messages
    .map(
      (message) =>
        `<TALLYMESSAGE xmlns:UDF="TallyUDF">${message}</TALLYMESSAGE>`,
    )
    .join('\n')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ENVELOPE>',
    '<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>',
    '<BODY><IMPORTDATA>',
    `<REQUESTDESC>${tag('REPORTNAME', reportName)}</REQUESTDESC>`,
    '<REQUESTDATA>',
    ...(body ? [body] : []),
    '</REQUESTDATA>',
    '</IMPORTDATA></BODY>',
    '</ENVELOPE>',
    '',
  ].join('\n')
}

type LedgerMaster = { name: string; parent: string; extra: string }

type LedgerLine = {
  ledger: string
  debit: Decimal
  isParty?: boolean
  bill?: { name: string; type: 'New Ref' | 'Agst Ref' }
}

type InventoryLine = {
  item: string
  ledger: string
  quantity: string
  unit: string
  rate: string
  discountPercent: string
  debit: Decimal
}

type Voucher = {
  type: string
  date: string
  number: string
  reference?: string
  party?: string
  narration: string
  ledgerLines: Array<LedgerLine>
  inventoryLines: Array<InventoryLine>
}

function partyLedgerXml(party: TallyExportInput['parties'][number]): string {
  const name = escapeXml(party.name)
  const address = [party.addressLine1, party.addressLine2, party.city]
    .map((line) => line?.trim() ?? '')
    .filter(Boolean)
  const state = STATE_NAME_BY_CODE.get(party.stateCode) ?? ''
  return [
    `<LEDGER NAME="${name}" ACTION="Create">`,
    `<NAME.LIST>${tag('NAME', party.name)}</NAME.LIST>`,
    tag(
      'PARENT',
      party.partyType === 'supplier' ? SUNDRY_CREDITORS : SUNDRY_DEBTORS,
    ),
    tag('ISBILLWISEON', 'Yes'),
    tag('MAILINGNAME', party.name),
    address.length > 0
      ? `<ADDRESS.LIST TYPE="String">${address.map((line) => tag('ADDRESS', line)).join('')}</ADDRESS.LIST>`
      : '',
    state ? tag('LEDSTATENAME', state) : '',
    tag('COUNTRYNAME', 'India'),
    party.pincode?.trim() ? tag('PINCODE', party.pincode.trim()) : '',
    tag('GSTREGISTRATIONTYPE', party.gstin ? 'Regular' : 'Unregistered'),
    party.gstin ? tag('PARTYGSTIN', party.gstin) : '',
    '</LEDGER>',
  ].join('')
}

function ledgerXml(ledger: LedgerMaster): string {
  return (
    `<LEDGER NAME="${escapeXml(ledger.name)}" ACTION="Create">` +
    `<NAME.LIST>${tag('NAME', ledger.name)}</NAME.LIST>` +
    tag('PARENT', ledger.parent) +
    ledger.extra +
    '</LEDGER>'
  )
}

function unitXml(unit: string): string {
  return (
    `<UNIT NAME="${escapeXml(unit)}" ACTION="Create">` +
    tag('NAME', unit) +
    tag('ISSIMPLEUNIT', 'Yes') +
    '</UNIT>'
  )
}

function stockItemXml(item: TallyExportInput['items'][number]): string {
  const igst = money(item.gstRate)
  const half = igst.div(2)
  const rates: Array<[string, Decimal]> = [
    ['CGST', half],
    ['SGST/UTGST', half],
    ['IGST', igst],
  ]
  return [
    `<STOCKITEM NAME="${escapeXml(item.name)}" ACTION="Create">`,
    `<NAME.LIST>${tag('NAME', item.name)}</NAME.LIST>`,
    tag('BASEUNITS', item.baseUnit),
    '<GSTDETAILS.LIST>',
    tag('APPLICABLEFROM', '20170701'),
    tag('HSNCODE', item.hsnCode),
    tag('TAXABILITY', igst.gt(0) ? 'Taxable' : 'Exempt'),
    `<STATEWISEDETAILS.LIST><STATENAME>${RESERVED_ANY}</STATENAME>`,
    ...rates.map(
      ([head, rate]) =>
        `<RATEDETAILS.LIST>${tag('GSTRATEDUTYHEAD', head)}${tag('GSTRATE', rate.toString())}</RATEDETAILS.LIST>`,
    ),
    '</STATEWISEDETAILS.LIST>',
    '</GSTDETAILS.LIST>',
    '</STOCKITEM>',
  ].join('')
}

function voucherXml(voucher: Voucher): string {
  const ledgerLines = voucher.ledgerLines
    .filter((line) => !line.debit.isZero())
    .map((line) =>
      [
        '<ALLLEDGERENTRIES.LIST>',
        tag('LEDGERNAME', line.ledger),
        line.isParty ? tag('ISPARTYLEDGER', 'Yes') : '',
        amountTags(line.debit),
        line.bill
          ? `<BILLALLOCATIONS.LIST>${tag('NAME', line.bill.name)}${tag('BILLTYPE', line.bill.type)}${tag('AMOUNT', line.debit.negated().toFixed(2))}</BILLALLOCATIONS.LIST>`
          : '',
        '</ALLLEDGERENTRIES.LIST>',
      ].join(''),
    )
  const inventoryLines = voucher.inventoryLines.map((line) => {
    const quantity = `${line.quantity} ${line.unit}`
    return [
      '<ALLINVENTORYENTRIES.LIST>',
      tag('STOCKITEMNAME', line.item),
      tag('RATE', `${line.rate}/${line.unit}`),
      money(line.discountPercent).gt(0)
        ? tag('DISCOUNT', line.discountPercent)
        : '',
      amountTags(line.debit),
      tag('ACTUALQTY', quantity),
      tag('BILLEDQTY', quantity),
      '<ACCOUNTINGALLOCATIONS.LIST>',
      tag('LEDGERNAME', line.ledger),
      amountTags(line.debit),
      '</ACCOUNTINGALLOCATIONS.LIST>',
      '</ALLINVENTORYENTRIES.LIST>',
    ].join('')
  })
  const isInvoice = voucher.inventoryLines.length > 0
  return [
    `<VOUCHER VCHTYPE="${escapeXml(voucher.type)}" ACTION="Create"${isInvoice ? ' OBJVIEW="Invoice Voucher View"' : ''}>`,
    tag('DATE', tallyDate(voucher.date)),
    tag('VOUCHERTYPENAME', voucher.type),
    voucher.number ? tag('VOUCHERNUMBER', voucher.number) : '',
    voucher.reference ? tag('REFERENCE', voucher.reference) : '',
    voucher.party ? tag('PARTYLEDGERNAME', voucher.party) : '',
    voucher.narration ? tag('NARRATION', voucher.narration) : '',
    isInvoice ? tag('ISINVOICE', 'Yes') : '',
    ...inventoryLines,
    ...ledgerLines,
    '</VOUCHER>',
  ].join('')
}

function splitGst(
  total: Decimal,
  intraState: boolean,
): Array<{ head: GstHead; amount: Decimal }> {
  if (!intraState) return [{ head: 'IGST', amount: total }]
  const cgst = total.div(2).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
  return [
    { head: 'CGST', amount: cgst },
    { head: 'SGST', amount: total.minus(cgst) },
  ]
}

/**
 * Tally "Import Data" XML for the accountant: one masters file (units,
 * ledgers with parties under Sundry Debtors/Creditors, GST ledgers under
 * Duties & Taxes, stock items) and one vouchers file for the period.
 * Cancelled invoices are left out. Every voucher's amounts sum to zero.
 */
export function buildTallyXml(input: TallyExportInput): TallyExport {
  const inPeriod = (date: string) => date >= input.from && date <= input.to
  const accountsById = new Map(
    input.ledgers.map((ledger) => [ledger.id, ledger]),
  )
  const partiesById = new Map(input.parties.map((party) => [party.id, party]))
  const itemsById = new Map(input.items.map((item) => [item.id, item]))

  const masters = new Map<string, LedgerMaster>()
  for (const ledger of input.ledgers) {
    masters.set(ledger.name, {
      name: ledger.name,
      parent: ledger.systemKey
        ? GROUP_BY_SYSTEM_KEY[ledger.systemKey]
        : GROUP_BY_ACCOUNT_TYPE[ledger.accountType],
      extra: '',
    })
  }
  for (const direction of ['Output', 'Input']) {
    for (const { head, dutyHead } of GST_HEADS) {
      const name = `${direction} ${head}`
      masters.set(name, {
        name,
        parent: DUTIES_AND_TAXES,
        extra: tag('TAXTYPE', 'GST') + tag('GSTDUTYHEAD', dutyHead),
      })
    }
  }

  const ledgerFor = (
    systemKey: NonNullable<LedgerAccountRecord['systemKey']>,
    fallbackName: string,
  ) => {
    const account = input.ledgers.find(
      (ledger) => ledger.systemKey === systemKey,
    )
    if (account) return account.name
    if (!masters.has(fallbackName)) {
      masters.set(fallbackName, {
        name: fallbackName,
        parent: GROUP_BY_SYSTEM_KEY[systemKey],
        extra: '',
      })
    }
    return fallbackName
  }
  const salesLedger = ledgerFor('sales', 'Sales')
  const purchaseLedger = ledgerFor('purchase', 'Purchase')

  const extraParties: Array<TallyExportInput['parties'][number]> = []
  const partyName = (
    partyId: string,
    snapshotName: string,
    partyType: 'customer' | 'supplier',
  ) => {
    const party = partiesById.get(partyId)
    if (party) return party.name
    // A party removed after posting still needs a ledger in Tally.
    const fallback = {
      id: partyId,
      name: snapshotName,
      partyType,
      gstin: null,
      stateCode: input.companyStateCode,
    }
    partiesById.set(partyId, fallback)
    extraParties.push(fallback)
    return snapshotName
  }

  const itemLines = (
    lines: Array<DocumentLine>,
    ledger: string,
    sign: 1 | -1,
  ): Array<InventoryLine> =>
    lines.map((line) => ({
      item: itemsById.get(line.itemId)?.name ?? line.description,
      ledger,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      discountPercent: line.discountPercent,
      debit: money(line.taxableAmount).times(sign),
    }))

  /** Freight, packing, discount and round-off, so the voucher balances. */
  const residual = (
    total: Decimal,
    gst: Decimal,
    inventory: Array<InventoryLine>,
  ) =>
    inventory.reduce(
      (rest, line) => rest.minus(line.debit.abs()),
      total.minus(gst),
    )

  const vouchers: Array<Voucher> = []

  for (const invoice of input.invoices) {
    if (invoice.status === 'cancelled' || !inPeriod(invoice.invoiceDate)) {
      continue
    }
    const party = partyName(
      invoice.customerId,
      invoice.partyNameSnapshot,
      'customer',
    )
    const total = money(invoice.totalAmount)
    const gst = money(invoice.totalGstAmount)
    const inventory = itemLines(invoice.lines, salesLedger, -1)
    const isCash = invoice.paymentMode === 'cash'
    vouchers.push({
      type: 'Sales',
      date: invoice.invoiceDate,
      number: invoice.invoiceNumber,
      party: isCash ? undefined : party,
      narration: invoice.narration,
      inventoryLines: inventory,
      ledgerLines: [
        isCash
          ? { ledger: ledgerFor('cash', 'Cash'), debit: total }
          : {
              ledger: party,
              debit: total,
              isParty: true,
              bill: { name: invoice.invoiceNumber, type: 'New Ref' },
            },
        ...splitGst(gst, invoice.placeOfSupply === input.companyStateCode).map(
          ({ head, amount }) => ({
            ledger: `Output ${head}`,
            debit: amount.negated(),
          }),
        ),
        {
          ledger: salesLedger,
          debit: residual(total, gst, inventory).negated(),
        },
      ],
    })
  }

  for (const bill of input.bills) {
    if (!inPeriod(bill.billDate)) continue
    const party = partyName(bill.supplierId, bill.partyNameSnapshot, 'supplier')
    const total = money(bill.totalAmount)
    const gst = money(bill.totalGstAmount)
    const inventory = itemLines(bill.lines, purchaseLedger, 1)
    vouchers.push({
      type: 'Purchase',
      date: bill.billDate,
      number: bill.supplierBillNumber,
      reference: bill.supplierBillNumber,
      party,
      narration: bill.narration,
      inventoryLines: inventory,
      ledgerLines: [
        {
          ledger: party,
          debit: total.negated(),
          isParty: true,
          bill: { name: bill.supplierBillNumber, type: 'New Ref' },
        },
        ...splitGst(gst, bill.placeOfSupply === input.companyStateCode).map(
          ({ head, amount }) => ({ ledger: `Input ${head}`, debit: amount }),
        ),
        { ledger: purchaseLedger, debit: residual(total, gst, inventory) },
      ],
    })
  }

  const noteEntryIds = new Set<string>()
  for (const note of input.notes) {
    noteEntryIds.add(note.ledgerEntryId)
    if (!inPeriod(note.noteDate)) continue
    const isCredit = note.noteType === 'credit'
    const partyRecord = partiesById.get(note.partyId)
    const party = partyName(
      note.partyId,
      'Unknown party',
      isCredit ? 'customer' : 'supplier',
    )
    const intraState =
      (partyRecord?.stateCode ?? input.companyStateCode) ===
      input.companyStateCode
    const total = money(note.totalAmount)
    const gst = money(note.totalGstAmount)
    // A credit note reverses a sale; a debit note reverses a purchase.
    const sign = isCredit ? 1 : -1
    vouchers.push({
      type: isCredit ? 'Credit Note' : 'Debit Note',
      date: note.noteDate,
      number: note.noteNumber,
      party,
      narration: note.narration,
      inventoryLines: [],
      ledgerLines: [
        { ledger: party, debit: total.times(-sign), isParty: true },
        ...splitGst(gst, intraState).map(({ head, amount }) => ({
          ledger: `${isCredit ? 'Output' : 'Input'} ${head}`,
          debit: amount.times(sign),
        })),
        {
          ledger: isCredit ? salesLedger : purchaseLedger,
          debit: total.minus(gst).times(sign),
        },
      ],
    })
  }

  // Receipts and payments post to the control accounts; point them back at
  // the party through the invoice or bill named in the narration.
  const customerByInvoice = new Map<string, string>()
  for (const invoice of input.invoices) {
    customerByInvoice.set(
      invoice.invoiceNumber,
      partyName(invoice.customerId, invoice.partyNameSnapshot, 'customer'),
    )
  }
  const suppliersByBill = new Map<string, Set<string>>()
  for (const bill of input.bills) {
    const suppliers = suppliersByBill.get(bill.supplierBillNumber) ?? new Set()
    suppliers.add(
      partyName(bill.supplierId, bill.partyNameSnapshot, 'supplier'),
    )
    suppliersByBill.set(bill.supplierBillNumber, suppliers)
  }
  const settledParty = (
    entry: TallyExportInput['entries'][number],
  ): { party: string; billName: string; controlKey: string } | null => {
    const receipt = /^Receipt against (.+)$/.exec(entry.narration)
    if (entry.voucherType === 'receipt' && receipt) {
      const party = customerByInvoice.get(receipt[1])
      return party
        ? { party, billName: receipt[1], controlKey: 'customer_receivable' }
        : null
    }
    const payment = /^Payment against (.+)$/.exec(entry.narration)
    if (entry.voucherType === 'payment' && payment) {
      const suppliers = suppliersByBill.get(payment[1])
      return suppliers?.size === 1
        ? {
            party: [...suppliers][0],
            billName: payment[1],
            controlKey: 'supplier_payable',
          }
        : null
    }
    return null
  }

  for (const entry of input.entries) {
    if (
      entry.voucherType === 'sales' ||
      entry.voucherType === 'purchase' ||
      noteEntryIds.has(entry.id) ||
      !inPeriod(entry.entryDate)
    ) {
      continue
    }
    const settled = settledParty(entry)
    vouchers.push({
      type: VOUCHER_TYPE_NAMES[entry.voucherType],
      date: entry.entryDate,
      number: '',
      party: settled?.party,
      narration: entry.narration,
      inventoryLines: [],
      ledgerLines: entry.lines.map((line) => {
        const account = accountsById.get(line.ledgerAccountId)
        const debit = money(line.debit).minus(money(line.credit))
        if (settled && account?.systemKey === settled.controlKey) {
          return {
            ledger: settled.party,
            debit,
            isParty: true,
            bill: { name: settled.billName, type: 'Agst Ref' as const },
          }
        }
        return { ledger: account?.name ?? 'Suspense', debit }
      }),
    })
  }

  if (
    vouchers.some((voucher) =>
      voucher.ledgerLines.some((line) => line.ledger === 'Suspense'),
    )
  ) {
    masters.set('Suspense', {
      name: 'Suspense',
      parent: 'Suspense A/c',
      extra: '',
    })
  }

  vouchers.sort((a, b) => a.date.localeCompare(b.date))

  const units = new Set<string>()
  for (const item of input.items) units.add(item.baseUnit)
  for (const voucher of vouchers) {
    for (const line of voucher.inventoryLines) units.add(line.unit)
  }

  const masterMessages = [
    ...[...units].filter(Boolean).map(unitXml),
    ...[...masters.values()].map(ledgerXml),
    ...[...input.parties, ...extraParties].map(partyLedgerXml),
    ...input.items.map(stockItemXml),
  ]

  return {
    masters: envelope('All Masters', masterMessages),
    vouchers: envelope('Vouchers', vouchers.map(voucherXml)),
    voucherCount: vouchers.length,
  }
}
