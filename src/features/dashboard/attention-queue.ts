import Decimal from 'decimal.js'

import type { Capability } from '#/features/companies/membership-service.ts'

/**
 * Pure ranking brain for the dashboard "Needs attention" queue. It reads no
 * clock, no database and no request context: every signal arrives as input so
 * the same call always produces the same ordered list. Intended to be lifted
 * into the server-side dashboard snapshot unchanged.
 */

export type AttentionTone =
  | 'money-in'
  | 'money-out'
  | 'gst'
  | 'inventory'
  | 'banking'
  | 'neutral'

export type AttentionItemKind =
  | 'gst-due'
  | 'overdue-receivable'
  | 'overdue-payable'
  | 'low-stock'
  | 'unreconciled-bank'
  | 'ocr-draft'
  | 'pending-conversion'

/**
 * Where a row sends the user: a pathname plus structured search params, the
 * shape a router `Link` documents. The keys mirror each target route's
 * `validateSearch` schema — `party` on the sales and purchase registers, `item`
 * on inventory — so a filter that changes name breaks loudly rather than
 * silently landing on an unfiltered list.
 */
export type AttentionLink = {
  to: string
  /** Absent, not empty, when the destination takes no params. */
  search?: { party: string } | { item: string }
}

export type AttentionItem = AttentionLink & {
  id: string
  kind: AttentionItemKind
  title: string
  detail: string
  amount?: string
  tone: AttentionTone
  score: number
  /** The party's phone on overdue rows, for a payment reminder. */
  contactPhone?: string
  /**
   * Whether this caller can do the thing the row asks for. Rows they may read
   * but not act on stay in the queue as information, without an action
   * affordance.
   */
  actionable: boolean
}

/** An item before the caller's capabilities decide `actionable`. */
type AttentionCandidate = Omit<AttentionItem, 'actionable'>

/** One party's overdue position, already collapsed across their documents. */
export type OverduePartySignal = {
  partyId: string
  partyName: string
  documentCount: number
  outstandingAmount: string
  maxDaysPastDue: number
  contactPhone?: string
}

export type GstSignal = {
  netPayableAmount: string
  periodLabel: string
  filingDueDate?: string
}

export type LowStockSignal = {
  itemId: string
  itemName: string
  availableQuantity: number
  reorderLevel: number
}

export type PendingConversionSignal = {
  kind: 'purchase-order' | 'goods-receipt'
  count: number
}

export type AttentionQueueInput = {
  /** `YYYY-MM-DD`. The only notion of "now" this module has. */
  asOf: string
  overdueReceivables?: Array<OverduePartySignal>
  overduePayables?: Array<OverduePartySignal>
  gst?: GstSignal
  lowStock?: Array<LowStockSignal>
  unreconciledBankCount?: number
  unreconciledBankAccountLabel?: string
  ocrDraftCount?: number
  pendingConversions?: Array<PendingConversionSignal>
  /**
   * The caller's capabilities. Required on purpose: a permission filter that
   * quietly returns nothing when the argument is forgotten is indistinguishable
   * from a broken dashboard.
   */
  capabilities: ReadonlyArray<Capability>
}

export const ATTENTION_QUEUE_LIMIT = 6

const MONEY_BASE = 38
const MONEY_AMOUNT_CAP = 30
/**
 * Points per 10x of outstanding amount. Tuned so size still separates rows up
 * to roughly ₹3 crore instead of flattening at ₹10 lakh, while keeping the
 * money ceiling below the statutory GST ceiling.
 */
const MONEY_AMOUNT_PER_DECADE = 4
const MONEY_OVERDUE_CAP = 30
const MONEY_OVERDUE_PER_DAY = 0.5

const GST_FLOOR = 45
const GST_CEILING = 100
const GST_WINDOW_DAYS = 15

const LOW_STOCK_BASE = 20
const LOW_STOCK_SHORTFALL_SPAN = 35

const BANK_BASE = 18
const BANK_PER_LINE = 0.3
const BANK_LINE_CAP = 50

const OCR_BASE = 16
const OCR_PER_DRAFT = 0.5
const OCR_DRAFT_CAP = 20

const CONVERSION_BASE = 14
const CONVERSION_PER_DOCUMENT = 0.4
const CONVERSION_DOCUMENT_CAP = 20

/** Fixed order used to break score ties before falling back to `id`. */
const KIND_PRIORITY: Record<AttentionItemKind, number> = {
  'gst-due': 0,
  'overdue-receivable': 1,
  'overdue-payable': 2,
  'low-stock': 3,
  'unreconciled-bank': 4,
  'ocr-draft': 5,
  'pending-conversion': 6,
}

/**
 * The capability needed to *see* a row. Money and GST rows require
 * `view_reports` because they summarise report-grade data, mirroring the
 * dashboard snapshot, which withholds ageing and GST from callers lacking it.
 */
const KIND_VISIBILITY: Record<AttentionItemKind, Capability> = {
  'gst-due': 'view_reports',
  'overdue-receivable': 'view_reports',
  'overdue-payable': 'view_reports',
  'low-stock': 'view',
  'unreconciled-bank': 'view',
  'ocr-draft': 'view',
  'pending-conversion': 'view',
}

/** The capability needed to act on a row; without it the row is informational. */
const KIND_ACTION: Record<AttentionItemKind, Capability> = {
  'gst-due': 'manage_gst',
  'overdue-receivable': 'post_payment',
  'overdue-payable': 'post_payment',
  'low-stock': 'manage_inventory',
  'unreconciled-bank': 'reconcile_bank',
  'ocr-draft': 'post_purchase',
  'pending-conversion': 'post_purchase',
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function toAmount(value: string) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function calendarDaysBetween(from: string, to: string): number | null {
  const fromMs = Date.parse(`${from.slice(0, 10)}T00:00:00Z`)
  const toMs = Date.parse(`${to.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return null
  return Math.round((toMs - fromMs) / 86_400_000)
}

function plural(count: number, singular: string) {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

/**
 * Money at risk: rises with both size and age, each capped so no single
 * dimension can run away. Tops out below the statutory GST ceiling.
 */
function moneyScore(amount: number, daysPastDue: number) {
  const amountPoints = Math.min(
    MONEY_AMOUNT_CAP,
    Math.log10(amount + 1) * MONEY_AMOUNT_PER_DECADE,
  )
  const overduePoints = Math.min(
    MONEY_OVERDUE_CAP,
    Math.max(0, daysPastDue) * MONEY_OVERDUE_PER_DAY,
  )
  return MONEY_BASE + amountPoints + overduePoints
}

/**
 * A hard external deadline: flat and low while the filing date is far off or
 * unknown, then climbing to the ceiling as it lands.
 */
function gstScore(daysToDue: number | null) {
  if (daysToDue === null || daysToDue >= GST_WINDOW_DAYS) return GST_FLOOR
  if (daysToDue < 0) return GST_CEILING
  const closeness = (GST_WINDOW_DAYS - daysToDue) / GST_WINDOW_DAYS
  return GST_FLOOR + closeness * (GST_CEILING - GST_FLOOR)
}

/** One row per party, even when the caller passes several rows for the same one. */
function collapseByParty(signals: Array<OverduePartySignal>) {
  const byParty = new Map<string, OverduePartySignal>()

  for (const signal of signals) {
    const existing = byParty.get(signal.partyId)
    if (!existing) {
      byParty.set(signal.partyId, { ...signal })
      continue
    }
    existing.documentCount += signal.documentCount
    existing.outstandingAmount = new Decimal(existing.outstandingAmount)
      .plus(signal.outstandingAmount)
      .toFixed(2)
    existing.maxDaysPastDue = Math.max(
      existing.maxDaysPastDue,
      signal.maxDaysPastDue,
    )
  }

  return [...byParty.values()]
}

function overdueItems(
  signals: Array<OverduePartySignal>,
  kind: 'overdue-receivable' | 'overdue-payable',
): Array<AttentionCandidate> {
  const isReceivable = kind === 'overdue-receivable'

  return collapseByParty(signals)
    .filter((signal) => toAmount(signal.outstandingAmount) > 0)
    .map((signal) => ({
      id: `${kind}:${signal.partyId}`,
      kind,
      title: isReceivable
        ? `Collect from ${signal.partyName}`
        : `Pay ${signal.partyName}`,
      detail: `${plural(
        signal.documentCount,
        isReceivable ? 'invoice' : 'bill',
      )} overdue · oldest ${Math.max(0, signal.maxDaysPastDue)} days past due`,
      amount: new Decimal(signal.outstandingAmount).toFixed(2),
      tone: isReceivable ? ('money-in' as const) : ('money-out' as const),
      to: isReceivable ? '/app/sales' : '/app/purchases',
      search: { party: signal.partyId },
      ...(signal.contactPhone ? { contactPhone: signal.contactPhone } : {}),
      score: moneyScore(
        toAmount(signal.outstandingAmount),
        signal.maxDaysPastDue,
      ),
    }))
}

function gstItem(signal: GstSignal, asOf: string): Array<AttentionCandidate> {
  const payable = toAmount(signal.netPayableAmount)
  if (payable <= 0) return []

  const daysToDue = signal.filingDueDate
    ? calendarDaysBetween(asOf, signal.filingDueDate)
    : null

  let detail: string
  if (daysToDue === null) {
    detail = 'Filing due date not set'
  } else if (daysToDue < 0) {
    detail = `Filing was due ${plural(Math.abs(daysToDue), 'day')} ago`
  } else if (daysToDue === 0) {
    detail = 'Filing due today'
  } else {
    detail = `Filing due in ${plural(daysToDue, 'day')}`
  }

  return [
    {
      id: 'gst-due',
      kind: 'gst-due',
      title: `GST payable for ${signal.periodLabel}`,
      detail,
      amount: new Decimal(signal.netPayableAmount).toFixed(2),
      tone: 'gst',
      to: '/app/reports',
      score: gstScore(daysToDue),
    },
  ]
}

function lowStockItems(
  signals: Array<LowStockSignal>,
): Array<AttentionCandidate> {
  return signals
    .filter(
      (signal) =>
        signal.availableQuantity <= 0 ||
        signal.availableQuantity <= signal.reorderLevel,
    )
    .map((signal) => {
      const shortfall =
        signal.reorderLevel > 0
          ? Math.min(
              1,
              Math.max(
                0,
                (signal.reorderLevel - signal.availableQuantity) /
                  signal.reorderLevel,
              ),
            )
          : 1
      return {
        id: `low-stock:${signal.itemId}`,
        kind: 'low-stock' as const,
        title:
          signal.availableQuantity <= 0
            ? `${signal.itemName} is out of stock`
            : `${signal.itemName} is below reorder level`,
        detail: `${signal.availableQuantity} in stock · reorder at ${signal.reorderLevel}`,
        tone: 'inventory' as const,
        to: '/app/inventory',
        search: { item: signal.itemId },
        score: LOW_STOCK_BASE + shortfall * LOW_STOCK_SHORTFALL_SPAN,
      }
    })
}

function bankItem(
  count: number,
  accountLabel?: string,
): Array<AttentionCandidate> {
  if (count <= 0) return []

  return [
    {
      id: 'unreconciled-bank',
      kind: 'unreconciled-bank',
      title: accountLabel
        ? `${accountLabel} has ${plural(count, 'unreconciled line')}`
        : plural(count, 'unreconciled bank line'),
      detail: 'Match them against recorded payments and receipts',
      tone: 'banking',
      to: '/app/bank-reconciliation',
      score: BANK_BASE + Math.min(count, BANK_LINE_CAP) * BANK_PER_LINE,
    },
  ]
}

function ocrItem(count: number): Array<AttentionCandidate> {
  if (count <= 0) return []

  return [
    {
      id: 'ocr-draft',
      kind: 'ocr-draft',
      title: `${plural(count, 'scanned bill')} awaiting review`,
      detail: 'Confirm the drafts before they post',
      tone: 'neutral',
      to: '/app/ocr',
      score: OCR_BASE + Math.min(count, OCR_DRAFT_CAP) * OCR_PER_DRAFT,
    },
  ]
}

function conversionItems(
  signals: Array<PendingConversionSignal>,
): Array<AttentionCandidate> {
  return signals
    .filter((signal) => signal.count > 0)
    .map((signal) => {
      const isPurchaseOrder = signal.kind === 'purchase-order'
      return {
        id: `pending-conversion:${signal.kind}`,
        kind: 'pending-conversion' as const,
        title: `${plural(
          signal.count,
          isPurchaseOrder ? 'purchase order' : 'goods receipt',
        )} awaiting billing`,
        detail: isPurchaseOrder
          ? 'Convert them into purchase bills'
          : 'Bill the goods you have already received',
        tone: 'neutral' as const,
        to: isPurchaseOrder ? '/app/purchase-orders' : '/app/purchase-grns',
        score:
          CONVERSION_BASE +
          Math.min(signal.count, CONVERSION_DOCUMENT_CAP) *
            CONVERSION_PER_DOCUMENT,
      }
    })
}

function compareItems(left: AttentionItem, right: AttentionItem) {
  if (left.score !== right.score) return right.score - left.score
  const priority = KIND_PRIORITY[left.kind] - KIND_PRIORITY[right.kind]
  if (priority !== 0) return priority
  return left.id.localeCompare(right.id)
}

export function buildAttentionQueue(
  input: AttentionQueueInput,
): Array<AttentionItem> {
  // Fail closed: do not invent a `view` grant. Callers that omit capabilities
  // (or pass []) must see an empty queue rather than operational rows.
  const granted = new Set<Capability>(input.capabilities)

  const candidates: Array<AttentionCandidate> = [
    ...(input.gst ? gstItem(input.gst, input.asOf) : []),
    ...overdueItems(input.overdueReceivables ?? [], 'overdue-receivable'),
    ...overdueItems(input.overduePayables ?? [], 'overdue-payable'),
    ...lowStockItems(input.lowStock ?? []),
    ...bankItem(
      input.unreconciledBankCount ?? 0,
      input.unreconciledBankAccountLabel,
    ),
    ...ocrItem(input.ocrDraftCount ?? 0),
    ...conversionItems(input.pendingConversions ?? []),
  ]

  return candidates
    .filter((item) => granted.has(KIND_VISIBILITY[item.kind]))
    .map((item) => ({
      ...item,
      score: round(item.score),
      actionable: granted.has(KIND_ACTION[item.kind]),
    }))
    .sort(compareItems)
    .slice(0, ATTENTION_QUEUE_LIMIT)
}
