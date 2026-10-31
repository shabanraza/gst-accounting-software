import { DomainError } from '#/lib/domain-error.ts'
import Decimal from 'decimal.js'

export type StockMovementType =
  | 'opening'
  | 'purchase_in'
  | 'sale_out'
  | 'purchase_return_out'
  | 'sales_return_in'
  | 'adjustment'

export type StockMovementDirection = 'in' | 'out'

export type RecordStockMovementInput = {
  companyId: string
  itemId: string
  /** Shown in user-facing errors; not stored. */
  itemName?: string
  movementType: StockMovementType
  quantity: string
  unit: string
  referenceType: string
  referenceId: string
  occurredOn: string
  godownName?: string | null
  /**
   * Cost of an inbound movement (2dp). Omitted, stock comes in at the item's
   * current moving average. Ignored for outbound movements, which always leave
   * at the moving average.
   */
  value?: string
}

export type StockMovementRecord = RecordStockMovementInput & {
  id: string
  direction: StockMovementDirection
  godownName: string | null
  value: string
  createdAt: Date
}

export interface StockMovementRepository {
  createMovement: (
    movement: StockMovementRecord,
  ) => Promise<StockMovementRecord>
  /** Optional multi-row insert: one round trip for a whole document. */
  createMovements?: (
    movements: Array<StockMovementRecord>,
  ) => Promise<Array<StockMovementRecord>>
  listByCompanyId: (companyId: string) => Promise<Array<StockMovementRecord>>
  listByReference: (
    companyId: string,
    referenceType: string,
    referenceId: string,
  ) => Promise<Array<StockMovementRecord>>
}

export type StockBalanceRecord = {
  companyId: string
  itemId: string
  quantity: string
  value: string
}

export interface StockBalanceRepository {
  getBalance: (companyId: string, itemId: string) => Promise<string>
  getValue: (companyId: string, itemId: string) => Promise<string>
  /** Optional: read (in a transaction, row-lock) several balances at once. */
  getBalances?: (
    companyId: string,
    itemIds: Array<string>,
  ) => Promise<Map<string, { quantity: string; value: string }>>
  /** Optional: write several balances in one statement. */
  setBalances?: (
    companyId: string,
    balances: Array<{ itemId: string; quantity: string; value: string }>,
  ) => Promise<void>
  setBalance: (
    companyId: string,
    itemId: string,
    quantity: string,
    value: string,
  ) => Promise<void>
  listBalancesByCompany: (
    companyId: string,
  ) => Promise<Array<StockBalanceRecord>>
}

export class InsufficientStockError extends DomainError {
  constructor(item: string, requested: string, available: string) {
    super(
      `Insufficient stock for ${item}: requested ${requested}, available ${available}`,
    )
    this.name = 'InsufficientStockError'
  }
}

export class InvalidStockMovementError extends DomainError {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidStockMovementError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

const inboundTypes: Array<StockMovementType> = [
  'opening',
  'purchase_in',
  'sales_return_in',
  'adjustment',
]

function directionFor(movementType: StockMovementType): StockMovementDirection {
  if (movementType === 'sale_out' || movementType === 'purchase_return_out') {
    return 'out'
  }

  if (inboundTypes.includes(movementType)) {
    return 'in'
  }

  throw new InvalidStockMovementError(
    `Unsupported stock movement type: ${movementType}`,
  )
}

function quantity(value: string): Decimal {
  if (!/^\d+(\.\d{1,3})?$/.test(value)) {
    throw new InvalidStockMovementError(`Invalid stock quantity: ${value}`)
  }

  const amount = new Decimal(value)

  if (amount.lte(0)) {
    throw new InvalidStockMovementError(
      'Stock quantity must be greater than zero',
    )
  }

  return amount
}

function stockValue(value: string): Decimal {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    throw new InvalidStockMovementError(`Invalid stock value: ${value}`)
  }

  return new Decimal(value)
}

/** Value that `moved` units carry at the balance's moving average. */
function valueAtAverage(
  moved: Decimal,
  balanceQuantity: Decimal,
  balanceValue: Decimal,
): Decimal {
  if (balanceQuantity.lte(0)) {
    return new Decimal(0)
  }

  if (moved.gte(balanceQuantity)) {
    return balanceValue
  }

  return balanceValue
    .times(moved)
    .div(balanceQuantity)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
}

function normalizeQuantity(value: Decimal): string {
  return value
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

type StoredBalance = { quantity: string; value: string }

/**
 * One movement applied to a stored balance: validates stock, prices the
 * movement (purchase value, or moving average on the way out) and returns the
 * new balance in the same rounded form the store keeps.
 */
function applyMovement(
  input: RecordStockMovementInput,
  current: StoredBalance,
): { movement: StockMovementRecord; next: StoredBalance } {
  const direction = directionFor(input.movementType)
  const movementQuantity = quantity(input.quantity)
  const currentBalance = new Decimal(current.quantity)
  const currentValue = new Decimal(current.value)

  const nextBalance =
    direction === 'in'
      ? currentBalance.plus(movementQuantity)
      : currentBalance.minus(movementQuantity)

  if (nextBalance.isNegative()) {
    throw new InsufficientStockError(
      input.itemName ?? `item ${input.itemId}`,
      normalizeQuantity(movementQuantity),
      normalizeQuantity(currentBalance),
    )
  }

  const movementValue =
    direction === 'in' && input.value !== undefined
      ? stockValue(input.value)
      : valueAtAverage(movementQuantity, currentBalance, currentValue)
  const nextValue =
    direction === 'in'
      ? currentValue.plus(movementValue)
      : currentValue.minus(movementValue)

  const { itemName: _itemName, ...movementInput } = input
  const movement: StockMovementRecord = {
    ...movementInput,
    id: crypto.randomUUID(),
    quantity: normalizeQuantity(movementQuantity),
    direction,
    godownName: input.godownName ?? null,
    value: movementValue.toFixed(2),
    createdAt: new Date(),
  }

  return {
    movement,
    next: {
      quantity: normalizeQuantity(nextBalance),
      value: nextValue.toFixed(2),
    },
  }
}

export async function recordStockMovement(
  movementRepository: StockMovementRepository,
  balanceRepository: StockBalanceRepository,
  input: RecordStockMovementInput,
): Promise<StockMovementRecord> {
  const { movement, next } = applyMovement(input, {
    quantity: await balanceRepository.getBalance(input.companyId, input.itemId),
    value: await balanceRepository.getValue(input.companyId, input.itemId),
  })

  const created = await movementRepository.createMovement(movement)
  await balanceRepository.setBalance(
    input.companyId,
    input.itemId,
    next.quantity,
    next.value,
  )

  return created
}

/**
 * Records all stock lines of one document. With batch-capable repositories
 * this is one locked read, one insert and one balance write however many
 * lines there are; otherwise it falls back to one line at a time. Lines for
 * the same item are applied in order with the same maths as
 * recordStockMovement, and nothing is written if any line runs short.
 */
export async function recordStockMovements(
  movementRepository: StockMovementRepository,
  balanceRepository: StockBalanceRepository,
  inputs: Array<RecordStockMovementInput>,
): Promise<Array<StockMovementRecord>> {
  if (inputs.length === 0) return []
  if (
    !movementRepository.createMovements ||
    !balanceRepository.getBalances ||
    !balanceRepository.setBalances
  ) {
    const created: Array<StockMovementRecord> = []
    for (const input of inputs) {
      created.push(
        await recordStockMovement(movementRepository, balanceRepository, input),
      )
    }
    return created
  }

  const companyId = inputs[0].companyId
  if (inputs.some((input) => input.companyId !== companyId)) {
    throw new InvalidStockMovementError(
      'All stock lines of a document must belong to one company',
    )
  }

  const itemIds = [...new Set(inputs.map((input) => input.itemId))]
  const stored = await balanceRepository.getBalances(companyId, itemIds)
  const running = new Map<string, StoredBalance>(
    itemIds.map((itemId) => [
      itemId,
      stored.get(itemId) ?? { quantity: '0', value: '0.00' },
    ]),
  )

  const movements = inputs.map((input) => {
    const current = running.get(input.itemId) ?? {
      quantity: '0',
      value: '0.00',
    }
    const { movement, next } = applyMovement(input, current)
    running.set(input.itemId, next)
    return movement
  })

  const created = await movementRepository.createMovements(movements)
  await balanceRepository.setBalances(
    companyId,
    [...running].map(([itemId, balance]) => ({ itemId, ...balance })),
  )
  return created
}

export async function getCurrentStock(
  balanceRepository: StockBalanceRepository,
  companyId: string,
  itemId: string,
): Promise<string> {
  return balanceRepository.getBalance(companyId, itemId)
}
