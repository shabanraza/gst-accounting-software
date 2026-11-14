import { DomainError } from '#/lib/domain-error.ts'
import Decimal from 'decimal.js'

import { ensureSystemLedger } from '#/features/accounting/chart-of-accounts.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import { godownQuantity } from '#/features/inventory/godown-stock-service.ts'
import {
  InsufficientStockError,
  recordStockMovements,
} from '#/features/inventory/stock-movement-service.ts'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type {
  LedgerEntryRecord,
  LedgerPostingRepository,
} from '#/features/accounting/posting-engine.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'
import type { GodownRepository } from '#/features/inventory/godown-service.ts'
import type {
  ItemRecord,
  ItemRepository,
} from '#/features/inventory/item-service.ts'
import type {
  RecordStockMovementInput,
  StockBalanceRepository,
  StockMovementRecord,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

export const STOCK_JOURNAL_REFERENCE_TYPE = 'stock_journal'
const STOCK_JOURNAL_SERIES = 'SJ'
const STOCK_JOURNAL_VOUCHER_TYPE = 'stock_journal'

export type StockAdjustmentReason =
  'physical_count' | 'damage' | 'shrinkage' | 'other'

const reasonLabels: Record<StockAdjustmentReason, string> = {
  physical_count: 'Physical stock count',
  damage: 'Damage',
  shrinkage: 'Shrinkage',
  other: 'Stock write-off',
}

export type StockJournalDependencies = {
  stock: StockMovementRepository & StockBalanceRepository
  posting: LedgerPostingRepository
  sequences: DocumentSequenceRepository
  items: ItemRepository
  ledgers: LedgerAccountRepository
  financialYears: FinancialYearRepository
  godowns: GodownRepository
}

export type StockJournalLineInput = {
  itemId: string
  /** Counted quantity for a physical count, otherwise the quantity moved. */
  quantity: string
}

export type PostStockAdjustmentInput = {
  companyId: string
  date: string
  godownName: string
  reason: StockAdjustmentReason
  narration?: string
  lines: Array<StockJournalLineInput>
}

export type PostGodownTransferInput = {
  companyId: string
  date: string
  fromGodown: string
  toGodown: string
  lines: Array<StockJournalLineInput>
}

export type StockAdjustmentLineResult = {
  itemId: string
  bookQuantity: string
  countedQuantity: string
  /** Positive for a gain, negative for a loss. */
  difference: string
}

export type StockAdjustmentResult = {
  documentNumber: string
  lines: Array<StockAdjustmentLineResult>
  movements: Array<StockMovementRecord>
  ledgerEntry: LedgerEntryRecord | null
}

export type GodownTransferResult = {
  documentNumber: string
  movements: Array<StockMovementRecord>
}

export class InvalidStockJournalError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStockJournalError'
  }
}

export class MissingStockLedgerError extends DomainError {
  constructor() {
    super('A Stock In Hand ledger is required to post a stock adjustment')
    this.name = 'MissingStockLedgerError'
  }
}

function formatQuantity(value: Decimal): string {
  return value
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

function parseQuantity(value: string, allowZero: boolean): Decimal {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,3})?$/.test(trimmed)) {
    throw new InvalidStockJournalError(`Invalid quantity: ${value}`)
  }
  const quantity = new Decimal(trimmed)
  if (!allowZero && quantity.lte(0)) {
    throw new InvalidStockJournalError('Quantity must be greater than zero')
  }
  return quantity
}

function assertLines(lines: Array<StockJournalLineInput>) {
  if (lines.length === 0) {
    throw new InvalidStockJournalError('Add at least one item')
  }
  const seen = new Set<string>()
  for (const line of lines) {
    if (seen.has(line.itemId)) {
      throw new InvalidStockJournalError(
        'Each item can appear only once in a stock journal',
      )
    }
    seen.add(line.itemId)
  }
}

async function resolveGodowns(
  repository: GodownRepository,
  companyId: string,
  names: Array<string>,
): Promise<{ names: Array<string>; defaultGodownName: string }> {
  const godowns = await repository.listByCompanyId(companyId)
  const defaultGodown =
    godowns.find((godown) => godown.isDefault) ?? godowns.at(0)
  const resolved = names.map((name) => {
    const wanted = name.trim().toLowerCase()
    const godown = godowns.find((entry) => entry.name.toLowerCase() === wanted)
    if (!godown) {
      throw new InvalidStockJournalError(`Godown not found: ${name}`)
    }
    return godown.name
  })

  return {
    names: resolved,
    defaultGodownName: defaultGodown?.name ?? resolved[0],
  }
}

async function loadItems(
  repository: ItemRepository,
  companyId: string,
  lines: Array<StockJournalLineInput>,
): Promise<Map<string, ItemRecord>> {
  const items = new Map<string, ItemRecord>()
  for (const line of lines) {
    const item = await repository.findById(line.itemId)
    if (!item || item.companyId !== companyId) {
      throw new InvalidStockJournalError('Item not found')
    }
    if (!item.tracksInventory) {
      throw new InvalidStockJournalError(`${item.name} does not track stock`)
    }
    items.set(item.id, item)
  }
  return items
}

async function allocateJournalNumber(
  deps: Pick<StockJournalDependencies, 'financialYears' | 'sequences'>,
  companyId: string,
  date: string,
): Promise<string> {
  const financialYears = await deps.financialYears.listByCompanyId(companyId)
  const financialYear =
    financialYears.find(
      (year) => year.startDate <= date && date <= year.endDate,
    ) ??
    financialYears.find((year) => year.isActive) ??
    financialYears.at(0)

  if (!financialYear) {
    throw new InvalidStockJournalError(
      'Set up a financial year before posting a stock journal',
    )
  }

  return nextDocumentNumber(deps.sequences, {
    companyId,
    financialYearId: financialYear.id,
    voucherType: STOCK_JOURNAL_VOUCHER_TYPE,
    series: STOCK_JOURNAL_SERIES,
    padLength: 4,
  })
}

/** Moving-average rate, or the purchase rate when nothing is in stock. */
async function inboundRate(
  stock: StockBalanceRepository,
  item: ItemRecord,
): Promise<Decimal> {
  const quantity = new Decimal(await stock.getBalance(item.companyId, item.id))
  const value = new Decimal(await stock.getValue(item.companyId, item.id))
  if (quantity.gt(0)) {
    return value.div(quantity)
  }
  return new Decimal(item.purchaseRate || '0')
}

/**
 * Physical count or write-off in one godown. Gains come in at the moving
 * average, losses leave at it; the net value is posted as Dr/Cr Stock
 * Adjustment against Stock In Hand.
 */
export async function postStockAdjustment(
  deps: StockJournalDependencies,
  input: PostStockAdjustmentInput,
): Promise<StockAdjustmentResult> {
  assertLines(input.lines)
  const isCount = input.reason === 'physical_count'
  const {
    names: [godownName],
    defaultGodownName,
  } = await resolveGodowns(deps.godowns, input.companyId, [input.godownName])
  const items = await loadItems(deps.items, input.companyId, input.lines)
  const movementsSoFar = await deps.stock.listByCompanyId(input.companyId)

  const planned = input.lines.map((line) => {
    const item = items.get(line.itemId)!
    const quantity = parseQuantity(line.quantity, isCount)
    const book = new Decimal(
      godownQuantity(movementsSoFar, item.id, godownName, defaultGodownName),
    )
    const difference = isCount ? quantity.minus(book) : quantity.negated()

    if (difference.isNegative() && difference.abs().gt(book)) {
      throw new InsufficientStockError(
        `${item.name} in ${godownName}`,
        formatQuantity(difference.abs()),
        formatQuantity(book),
      )
    }

    return {
      item,
      result: {
        itemId: item.id,
        bookQuantity: formatQuantity(book),
        countedQuantity: formatQuantity(
          isCount ? quantity : book.plus(difference),
        ),
        difference: formatQuantity(difference),
      },
      difference,
    }
  })

  const changed = planned.filter((line) => !line.difference.isZero())
  if (changed.length === 0) {
    throw new InvalidStockJournalError(
      'Counted quantities match the book stock, so there is nothing to post',
    )
  }

  const stockAccount = (
    await deps.ledgers.listByCompanyId(input.companyId)
  ).find((account) => account.systemKey === 'stock_in_hand')
  if (!stockAccount) {
    throw new MissingStockLedgerError()
  }
  const adjustmentAccount = await ensureSystemLedger(
    deps.ledgers,
    input.companyId,
    'stock_adjustment',
  )

  const documentNumber = await allocateJournalNumber(
    deps,
    input.companyId,
    input.date,
  )

  const movementInputs: Array<RecordStockMovementInput> = []
  for (const line of changed) {
    const isGain = line.difference.isPositive()
    const quantity = line.difference.abs()
    movementInputs.push({
      companyId: input.companyId,
      itemId: line.item.id,
      itemName: line.item.name,
      movementType: isGain ? 'adjustment' : 'adjustment_out',
      quantity: formatQuantity(quantity),
      unit: line.item.baseUnit,
      referenceType: STOCK_JOURNAL_REFERENCE_TYPE,
      referenceId: documentNumber,
      occurredOn: input.date,
      godownName,
      ...(isGain
        ? {
            value: (await inboundRate(deps.stock, line.item))
              .times(quantity)
              .toFixed(2),
          }
        : {}),
    })
  }

  const movements = await recordStockMovements(
    deps.stock,
    deps.stock,
    movementInputs,
  )

  const net = movements.reduce(
    (sum, movement) =>
      movement.direction === 'in'
        ? sum.plus(movement.value)
        : sum.minus(movement.value),
    new Decimal(0),
  )

  let ledgerEntry: LedgerEntryRecord | null = null
  if (!net.isZero()) {
    const amount = net.abs().toFixed(2)
    const debitAccountId = net.isPositive()
      ? stockAccount.id
      : adjustmentAccount.id
    const creditAccountId = net.isPositive()
      ? adjustmentAccount.id
      : stockAccount.id
    const narration = input.narration?.trim()

    ledgerEntry = await postLedgerEntry(deps.posting, {
      companyId: input.companyId,
      entryDate: input.date,
      narration: `Stock journal ${documentNumber}: ${reasonLabels[input.reason]}${
        narration ? ` (${narration})` : ''
      }`,
      voucherType: 'journal',
      lines: [
        { ledgerAccountId: debitAccountId, debit: amount, credit: '0.00' },
        { ledgerAccountId: creditAccountId, debit: '0.00', credit: amount },
      ],
    })
  }

  return {
    documentNumber,
    lines: planned.map((line) => line.result),
    movements,
    ledgerEntry,
  }
}

/**
 * Moves stock from one godown to another: a transfer_out at the moving
 * average and a transfer_in at the same value, so quantity and value on hand
 * are unchanged and nothing is posted to the ledger.
 */
export async function postGodownTransfer(
  deps: Omit<StockJournalDependencies, 'posting' | 'ledgers'>,
  input: PostGodownTransferInput,
): Promise<GodownTransferResult> {
  assertLines(input.lines)
  const {
    names: [fromGodown, toGodown],
    defaultGodownName,
  } = await resolveGodowns(deps.godowns, input.companyId, [
    input.fromGodown,
    input.toGodown,
  ])
  if (fromGodown === toGodown) {
    throw new InvalidStockJournalError(
      'Choose two different godowns for a transfer',
    )
  }

  const items = await loadItems(deps.items, input.companyId, input.lines)
  const movementsSoFar = await deps.stock.listByCompanyId(input.companyId)
  const planned = input.lines.map((line) => {
    const item = items.get(line.itemId)!
    const quantity = parseQuantity(line.quantity, false)
    const available = new Decimal(
      godownQuantity(movementsSoFar, item.id, fromGodown, defaultGodownName),
    )
    if (quantity.gt(available)) {
      throw new InsufficientStockError(
        `${item.name} in ${fromGodown}`,
        formatQuantity(quantity),
        formatQuantity(available),
      )
    }
    return { item, quantity: formatQuantity(quantity) }
  })

  const documentNumber = await allocateJournalNumber(
    deps,
    input.companyId,
    input.date,
  )
  const base = {
    companyId: input.companyId,
    referenceType: STOCK_JOURNAL_REFERENCE_TYPE,
    referenceId: documentNumber,
    occurredOn: input.date,
  }

  const outbound = await recordStockMovements(
    deps.stock,
    deps.stock,
    planned.map((line) => ({
      ...base,
      itemId: line.item.id,
      itemName: line.item.name,
      movementType: 'transfer_out' as const,
      quantity: line.quantity,
      unit: line.item.baseUnit,
      godownName: fromGodown,
    })),
  )
  const inbound = await recordStockMovements(
    deps.stock,
    deps.stock,
    outbound.map((movement) => ({
      ...base,
      itemId: movement.itemId,
      movementType: 'transfer_in' as const,
      quantity: movement.quantity,
      unit: movement.unit,
      godownName: toGodown,
      value: movement.value,
    })),
  )

  return { documentNumber, movements: [...outbound, ...inbound] }
}
