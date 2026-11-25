import Decimal from 'decimal.js'

import { uqcForUnit } from '#/features/app-shell/data/india-masters.ts'
import {
  calculateGst,
  splitIntraStateGst,
} from '#/features/gst/gst-calculator.ts'
import { DomainError } from '#/lib/domain-error.ts'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

/**
 * E-way bills are generated on the NIC portal (ewaybillgst.gov.in) from the
 * bulk-upload JSON built here; the user then records the EWB number back.
 * Field list and codes follow the portal's bulk generation tool, version
 * below. See docs/feature-gap-vyapar-busy.md §4 for sources.
 */
export const EWAY_BILL_JSON_VERSION = '1.0.0621'
export const EWAY_BILL_PORTAL_URL = 'https://ewaybillgst.gov.in'

const DEFAULT_THRESHOLD = new Decimal(50000)
const MAX_DISTANCE_KM = 4000

/**
 * States that have notified a general intra-state limit above ₹50,000
 * (Rule 138(14)(d)). Where sources disagree the lower figure is used, so the
 * reminder errs towards asking. Goods-specific lower limits are not modelled.
 */
const INTRA_STATE_THRESHOLDS: Record<string, number> = {
  '03': 100000, // Punjab
  '07': 100000, // Delhi
  '08': 100000, // Rajasthan (₹2 lakh within one city)
  '10': 100000, // Bihar
  '20': 100000, // Jharkhand
  '23': 100000, // Madhya Pradesh
  '27': 100000, // Maharashtra
  '33': 100000, // Tamil Nadu
}

export type EWayBillTransportMode = 'road' | 'rail' | 'air' | 'ship'
export type EWayBillVehicleType = 'regular' | 'odc'
export type EWayBillChallanReason =
  | 'job_work'
  | 'for_own_use'
  | 'line_sales'
  | 'recipient_not_known'
  | 'exhibition'
  | 'others'

const transportModeCodes: Record<EWayBillTransportMode, number> = {
  road: 1,
  rail: 2,
  air: 3,
  ship: 4,
}

const challanReasonCodes: Record<EWayBillChallanReason, number> = {
  job_work: 4,
  for_own_use: 5,
  others: 8,
  line_sales: 10,
  recipient_not_known: 11,
  exhibition: 12,
}

export type EWayBillCompany = {
  gstin: string | null
  name: string
  addressLine1: string
  addressLine2: string
  city: string
  pincode: string
  stateCode: string
}

export type EWayBillParty = {
  gstin: string | null
  name: string
  addressLine1: string
  addressLine2: string
  city: string
  pincode: string
  stateCode: string
}

export type EWayBillLine = {
  productName: string
  description: string
  hsnCode: string
  quantity: string
  /** App unit label, e.g. "Piece"; mapped to the GST UQC. */
  unit: string
  taxableAmount: string
  gstRate: string
  gstAmount: string
}

export type EWayBillDocument = {
  kind: 'invoice' | 'challan'
  number: string
  /** YYYY-MM-DD */
  date: string
  /** State code the goods go to. */
  placeOfSupply: string
  totalAmount: string
  lines: Array<EWayBillLine>
}

export type EWayBillTransport = {
  mode: EWayBillTransportMode
  /** 0 lets the portal work it out from the PIN codes. */
  distanceKm: number
  vehicleNumber: string
  vehicleType: EWayBillVehicleType
  transporterId: string
  transporterName: string
  transportDocNumber: string
  /** YYYY-MM-DD, or empty */
  transportDocDate: string
  /** Delivery challans only. */
  subSupplyType?: EWayBillChallanReason
  subSupplyDescription?: string
}

export class InvalidEWayBillError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidEWayBillError'
  }
}

function invalid(message: string): never {
  throw new InvalidEWayBillError(message)
}

function money(value: string | number | Decimal) {
  return new Decimal(value || 0)
}

function toNumber(value: Decimal) {
  return value.toDecimalPlaces(2).toNumber()
}

function isServiceHsn(hsnCode: string) {
  return hsnCode.trim().startsWith('99')
}

function isTaxableGoods(line: Pick<EWayBillLine, 'hsnCode' | 'gstRate'>) {
  return !isServiceHsn(line.hsnCode) && money(line.gstRate).greaterThan(0)
}

export function eWayBillThreshold(fromStateCode: string, toStateCode: string) {
  if (fromStateCode !== toStateCode) return DEFAULT_THRESHOLD.toFixed(2)
  return new Decimal(
    INTRA_STATE_THRESHOLDS[fromStateCode] ?? DEFAULT_THRESHOLD,
  ).toFixed(2)
}

/**
 * Rule 138 consignment value: taxable value plus GST of the goods, leaving
 * out exempt (0%) goods and services.
 */
export function consignmentValue(
  lines: Array<
    Pick<EWayBillLine, 'hsnCode' | 'gstRate' | 'taxableAmount' | 'gstAmount'>
  >,
) {
  return lines
    .filter(isTaxableGoods)
    .reduce(
      (sum, line) =>
        sum.plus(money(line.taxableAmount)).plus(money(line.gstAmount)),
      new Decimal(0),
    )
    .toFixed(2)
}

export function isEWayBillDue(input: {
  companyGstin: string | null
  fromStateCode: string
  toStateCode: string
  cancelled: boolean
  hasEWayBill: boolean
  lines: Array<
    Pick<EWayBillLine, 'hsnCode' | 'gstRate' | 'taxableAmount' | 'gstAmount'>
  >
}) {
  if (!input.companyGstin?.trim() || input.cancelled || input.hasEWayBill) {
    return false
  }
  return money(consignmentValue(input.lines)).greaterThan(
    eWayBillThreshold(input.fromStateCode, input.toStateCode),
  )
}

/** Challan lines carry no tax; value them at quantity × rate with the item's GST. */
export function buildChallanLines(
  lines: Array<
    Omit<EWayBillLine, 'taxableAmount' | 'gstAmount'> & { rate: string }
  >,
  states: { fromStateCode: string; toStateCode: string },
): Array<EWayBillLine> {
  return lines.map(({ rate, ...line }) => {
    const taxable = money(line.quantity).mul(money(rate)).toDecimalPlaces(2)
    const gst = calculateGst({
      taxableAmount: taxable.toFixed(2),
      gstRate: line.gstRate,
      companyStateCode: states.fromStateCode,
      partyStateCode: states.toStateCode,
    })
    return {
      ...line,
      taxableAmount: taxable.toFixed(2),
      gstAmount: gst.totalGstAmount,
    }
  })
}

const PINCODE = /^[1-9][0-9]{5}$/
const GSTIN_LIKE = /^[0-9]{2}[0-9A-Z]{13}$/
const VEHICLE_PATTERNS = [
  /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/, // MH12AB1234
  /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/, // Bharat series
  /^TR[0-9A-Z]{6,13}$/, // temporary registration
]
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const STATE_CODE = /^[0-9]{2}$/
const DOC_NUMBER = /^[A-Za-z0-9/-]{1,16}$/

/**
 * For these challan reasons the goods stay with the consignor, so the portal
 * expects the consignor's own GSTIN and name as the recipient; the delivery
 * place is still where the goods go.
 */
const CONSIGNOR_IS_RECIPIENT = new Set<EWayBillChallanReason>([
  'for_own_use',
  'line_sales',
  'recipient_not_known',
  'exhibition',
])

export function normalizeVehicleNumber(value: string) {
  return value.replace(/[\s-]/g, '').toUpperCase()
}

function portalDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

function stateNumber(code: string) {
  return Number.parseInt(code, 10)
}

export function buildEWayBillJson(input: {
  company: EWayBillCompany
  party: EWayBillParty
  document: EWayBillDocument
  transport: EWayBillTransport
}) {
  const { company, party, document, transport } = input
  const companyGstin = company.gstin?.trim().toUpperCase()
  if (!companyGstin) {
    invalid('Add your GSTIN to the company profile to make an e-way bill.')
  }
  if (!PINCODE.test(company.pincode.trim())) {
    invalid('Add a 6-digit PIN code to the company profile.')
  }
  for (const code of [
    company.stateCode,
    party.stateCode,
    document.placeOfSupply,
  ]) {
    if (!STATE_CODE.test(code)) {
      invalid('Set the state on the company, the party and the document.')
    }
  }
  if (!DOC_NUMBER.test(document.number)) {
    invalid(
      `${document.number}: e-way bill document numbers can have up to 16 letters, digits, / or -.`,
    )
  }
  if (!PINCODE.test(party.pincode.trim())) {
    invalid(`Enter the 6-digit delivery PIN code for ${party.name}.`)
  }
  if (
    !Number.isInteger(transport.distanceKm) ||
    transport.distanceKm < 0 ||
    transport.distanceKm > MAX_DISTANCE_KM
  ) {
    invalid(`Enter a distance between 0 and ${MAX_DISTANCE_KM} km.`)
  }

  const vehicleNumber = normalizeVehicleNumber(transport.vehicleNumber)
  const transporterId = transport.transporterId.trim().toUpperCase()
  if (transporterId && !GSTIN_LIKE.test(transporterId)) {
    invalid('The transporter ID should be the 15-character GSTIN or TRANSIN.')
  }
  if (transport.mode === 'road') {
    if (!vehicleNumber && !transporterId) {
      invalid('Enter the vehicle number or transporter ID.')
    }
    if (
      vehicleNumber &&
      !VEHICLE_PATTERNS.some((pattern) => pattern.test(vehicleNumber))
    ) {
      invalid(`Check the vehicle number ${transport.vehicleNumber}.`)
    }
  } else if (
    !transport.transportDocNumber.trim() ||
    !ISO_DATE.test(transport.transportDocDate)
  ) {
    invalid('Enter the RR, airway bill or bill of lading number and date.')
  }
  const transportDocNumber = transport.transportDocNumber.trim()
  // By road the LR number is optional, and its date goes with it.
  const sendTransportDoc =
    transportDocNumber !== '' && ISO_DATE.test(transport.transportDocDate)

  let subSupplyType = 1
  let subSupplyDesc = ''
  let consignorIsRecipient = false
  if (document.kind === 'challan') {
    const reason = transport.subSupplyType ?? 'others'
    subSupplyType = challanReasonCodes[reason]
    consignorIsRecipient = CONSIGNOR_IS_RECIPIENT.has(reason)
    if (reason === 'others') {
      subSupplyDesc = transport.subSupplyDescription?.trim() ?? ''
      if (!subSupplyDesc) invalid('Say why the goods are moving.')
    }
  }

  const goods = document.lines.filter((line) => !isServiceHsn(line.hsnCode))
  if (goods.length === 0) {
    invalid('This document has no goods to move.')
  }
  for (const line of goods) {
    if (
      !/^[0-9]{4,8}$/.test(line.hsnCode.trim()) ||
      /^0+$/.test(line.hsnCode.trim())
    ) {
      invalid(`Add a 4 to 8 digit HSN code for ${line.productName}.`)
    }
  }

  const interState = company.stateCode !== document.placeOfSupply
  let totalValue = new Decimal(0)
  let cgst = new Decimal(0)
  let sgst = new Decimal(0)
  let igst = new Decimal(0)
  let mainLine = goods[0]

  const itemList = goods.map((line, index) => {
    const taxable = money(line.taxableAmount)
    const rate = money(line.gstRate)
    totalValue = totalValue.plus(taxable)
    if (interState) {
      igst = igst.plus(money(line.gstAmount))
    } else {
      const halves = splitIntraStateGst(line.gstAmount)
      cgst = cgst.plus(halves.cgst)
      sgst = sgst.plus(halves.sgst)
    }
    if (taxable.greaterThan(money(mainLine.taxableAmount))) mainLine = line
    const halfRate = rate.div(2).toNumber()
    return {
      itemNo: index + 1,
      productName: line.productName,
      productDesc: line.description.trim() || line.productName,
      hsnCode: Number(line.hsnCode.trim()),
      quantity: money(line.quantity).toNumber(),
      qtyUnit: uqcForUnit(line.unit),
      taxableAmount: toNumber(taxable),
      sgstRate: interState ? 0 : halfRate,
      cgstRate: interState ? 0 : halfRate,
      igstRate: interState ? rate.toNumber() : 0,
      cessRate: 0,
      cessNonAdvol: 0,
    }
  })

  const invoiceValue = money(document.totalAmount)
  const otherValue = invoiceValue
    .minus(totalValue)
    .minus(cgst)
    .minus(sgst)
    .minus(igst)

  return {
    version: EWAY_BILL_JSON_VERSION,
    billLists: [
      {
        userGstin: companyGstin,
        supplyType: 'O',
        subSupplyType,
        subSupplyDesc,
        docType: document.kind === 'challan' ? 'CHL' : 'INV',
        docNo: document.number,
        docDate: portalDate(document.date),
        transType: 1,
        fromGstin: companyGstin,
        fromTrdName: company.name,
        fromAddr1: company.addressLine1.trim(),
        fromAddr2: company.addressLine2.trim(),
        fromPlace: company.city.trim(),
        fromPincode: Number(company.pincode.trim()),
        fromStateCode: stateNumber(company.stateCode),
        actualFromStateCode: stateNumber(company.stateCode),
        toGstin: consignorIsRecipient
          ? companyGstin
          : party.gstin?.trim().toUpperCase() || 'URP',
        toTrdName: consignorIsRecipient ? company.name : party.name,
        toAddr1: party.addressLine1.trim(),
        toAddr2: party.addressLine2.trim(),
        toPlace: party.city.trim(),
        toPincode: Number(party.pincode.trim()),
        toStateCode: stateNumber(
          consignorIsRecipient ? company.stateCode : party.stateCode,
        ),
        actualToStateCode: stateNumber(document.placeOfSupply),
        totalValue: toNumber(totalValue),
        cgstValue: toNumber(cgst),
        sgstValue: toNumber(sgst),
        igstValue: toNumber(igst),
        cessValue: 0,
        TotNonAdvolVal: 0,
        OthValue: toNumber(otherValue),
        totInvValue: toNumber(invoiceValue),
        transMode: transportModeCodes[transport.mode],
        transDistance: transport.distanceKm,
        transporterId,
        transporterName: transport.transporterName.trim(),
        transDocNo: sendTransportDoc ? transportDocNumber : '',
        transDocDate: sendTransportDoc
          ? portalDate(transport.transportDocDate)
          : '',
        vehicleNo: transport.mode === 'road' ? vehicleNumber : '',
        vehicleType: transport.vehicleType === 'odc' ? 'O' : 'R',
        mainHsnCode: Number(mainLine.hsnCode.trim()),
        itemList,
      },
    ],
  }
}

export type EWayBillJson = ReturnType<typeof buildEWayBillJson>

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/**
 * Rule 138(10): one day per 200 km (20 km for over-dimensional cargo) or part
 * of it; each day ends at midnight of the day after generation, so the last
 * valid date is the EWB date plus that many days.
 */
export function defaultValidUntil(
  ewbDate: string,
  distanceKm: number,
  vehicleType: EWayBillVehicleType,
): string | null {
  // Distance 0 means the portal works it out, so the validity isn't known here.
  if (!ISO_DATE.test(ewbDate) || !(distanceKm > 0)) return null
  const perDay = vehicleType === 'odc' ? 20 : 200
  return addDays(ewbDate, Math.ceil(distanceKm / perDay))
}

export type EWayBillSource = { kind: 'invoice' | 'challan'; id: string }

export type EWayBillRecord = {
  id: string
  companyId: string
  salesInvoiceId: string | null
  salesDocumentId: string | null
  ewbNumber: string
  ewbDate: string
  validUntil: string
  vehicleNumber: string | null
  transportMode: EWayBillTransportMode
  distanceKm: number
  transporterId: string
  transporterName: string
  generatedAt: Date
  updatedAt: Date
}

export interface EWayBillRepository {
  findBySource: (
    companyId: string,
    source: EWayBillSource,
  ) => Promise<EWayBillRecord | null>
  listByCompanyId: (companyId: string) => Promise<Array<EWayBillRecord>>
  save: (record: EWayBillRecord) => Promise<EWayBillRecord>
  delete: (companyId: string, id: string) => Promise<boolean>
}

export type RecordEWayBillInput = {
  companyId: string
  source: EWayBillSource
  ewbNumber: string
  ewbDate: string
  validUntil: string
  vehicleNumber: string
  transportMode: EWayBillTransportMode
  distanceKm: number
  transporterId: string
  transporterName: string
}

export async function recordEWayBill(
  repository: EWayBillRepository,
  input: RecordEWayBillInput,
) {
  const ewbNumber = input.ewbNumber.replace(/\s/g, '')
  // 12 digits until 31 Dec 2026; numbers issued from 1 Jan 2027 have 14.
  if (!/^(?:[0-9]{12}|[0-9]{14})$/.test(ewbNumber)) {
    invalid('The e-way bill number has 12 or 14 digits.')
  }
  if (!ISO_DATE.test(input.ewbDate) || !ISO_DATE.test(input.validUntil)) {
    invalid('Enter the e-way bill date and valid-until date.')
  }
  if (input.validUntil < input.ewbDate) {
    invalid('Valid until cannot be before the e-way bill date.')
  }

  const existing = await repository.findBySource(input.companyId, input.source)
  const now = new Date()
  const vehicleNumber = normalizeVehicleNumber(input.vehicleNumber)
  return repository.save({
    id: existing?.id ?? crypto.randomUUID(),
    companyId: input.companyId,
    salesInvoiceId: input.source.kind === 'invoice' ? input.source.id : null,
    salesDocumentId: input.source.kind === 'challan' ? input.source.id : null,
    ewbNumber,
    ewbDate: input.ewbDate,
    validUntil: input.validUntil,
    vehicleNumber: vehicleNumber || null,
    transportMode: input.transportMode,
    distanceKm: input.distanceKm,
    transporterId: input.transporterId.trim().toUpperCase(),
    transporterName: input.transporterName.trim(),
    generatedAt: existing?.generatedAt ?? now,
    updatedAt: now,
  })
}

export class EWayBillNotFoundError extends DomainError {
  constructor() {
    super('E-way bill not found')
    this.name = 'EWayBillNotFoundError'
  }
}

export async function removeEWayBill(
  repository: EWayBillRepository,
  input: { companyId: string; id: string },
) {
  const removed = await repository.delete(input.companyId, input.id)
  if (!removed) throw new EWayBillNotFoundError()
}
