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
}

export type StockMovementRecord = RecordStockMovementInput & {
  id: string
  direction: StockMovementDirection
  godownName: string | null
  createdAt: Date
}

export interface StockMovementRepository {
  createMovement: (
    movement: StockMovementRecord,
  ) => Promise<StockMovementRecord>
  /** Optional multi-row insert; one round trip for a whole document. */
  createMovements?: (
    movements: Array<StockMovementRecord>,
  ) => Promise<Array<StockMovementRecord>>
  listByCompanyId: (companyId: string) => Promise<Array<StockMovementRecord>>
}

export interface StockBalanceRepository {
  getBalance: (companyId: string, itemId: string) => Promise<string>
  /** Optional: read (and in a transaction, row-lock) several balances at once. */
  getBalances?: (
    companyId: string,
    itemIds: Array<string>,
  ) => Promise<Map<string, string>>
  /** Optional: write several balances in one statement. */
  setBalances?: (
    companyId: string,
    balances: Array<{ itemId: string; quantity: string }>,
  ) => Promise<void>
  setBalance: (
    companyId: string,
    itemId: string,
    quantity: string,
  ) => Promise<void>
  listBalancesByCompany: (
    companyId: string,
  ) => Promise<Array<{ companyId: string; itemId: string; quantity: string }>>
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

function normalizeQuantity(value: Decimal): string {
  return value
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

export async function recordStockMovement(
  movementRepository: StockMovementRepository,
  balanceRepository: StockBalanceRepository,
  input: RecordStockMovementInput,
): Promise<StockMovementRecord> {
  const direction = directionFor(input.movementType)
  const movementQuantity = quantity(input.quantity)
  const currentBalance = new Decimal(
    await balanceRepository.getBalance(input.companyId, input.itemId),
  )

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

  const { itemName: _itemName, ...movementInput } = input
  const movement: StockMovementRecord = {
    ...movementInput,
    id: crypto.randomUUID(),
    quantity: normalizeQuantity(movementQuantity),
    direction,
    godownName: input.godownName ?? null,
    createdAt: new Date(),
  }

  const created = await movementRepository.createMovement(movement)
  await balanceRepository.setBalance(
    input.companyId,
    input.itemId,
    normalizeQuantity(nextBalance),
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

/**
 * Records all stock lines of one document. With batch-capable repositories
 * this is one locked read, one insert and one balance write however many
 * lines there are; otherwise it falls back to one line at a time. Lines for
 * the same item are applied in order, and nothing is written if any runs short.
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
  const current = await balanceRepository.getBalances(companyId, itemIds)
  const running = new Map(
    itemIds.map((itemId) => [itemId, new Decimal(current.get(itemId) ?? '0')]),
  )

  const movements = inputs.map((input) => {
    const direction = directionFor(input.movementType)
    const movementQuantity = quantity(input.quantity)
    const balance = running.get(input.itemId) ?? new Decimal(0)
    const nextBalance =
      direction === 'in'
        ? balance.plus(movementQuantity)
        : balance.minus(movementQuantity)
    if (nextBalance.isNegative()) {
      throw new InsufficientStockError(
        input.itemName ?? `item ${input.itemId}`,
        normalizeQuantity(movementQuantity),
        normalizeQuantity(balance),
      )
    }
    running.set(input.itemId, nextBalance)

    const { itemName: _itemName, ...movementInput } = input
    return {
      ...movementInput,
      id: crypto.randomUUID(),
      quantity: normalizeQuantity(movementQuantity),
      direction,
      godownName: input.godownName ?? null,
      createdAt: new Date(),
    }
  })

  const created = await movementRepository.createMovements(movements)
  await balanceRepository.setBalances(
    companyId,
    [...running].map(([itemId, balance]) => ({
      itemId,
      quantity: normalizeQuantity(balance),
    })),
  )
  return created
}
