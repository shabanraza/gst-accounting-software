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
  listByCompanyId: (
    companyId: string,
    options?: { itemId?: string },
  ) => Promise<Array<StockMovementRecord>>
}

export interface StockBalanceRepository {
  getBalance: (companyId: string, itemId: string) => Promise<string>
  setBalance: (
    companyId: string,
    itemId: string,
    quantity: string,
  ) => Promise<void>
  listBalancesByCompany: (
    companyId: string,
  ) => Promise<Array<{ companyId: string; itemId: string; quantity: string }>>
}

export class InsufficientStockError extends Error {
  constructor(itemId: string, requested: string, available: string) {
    super(
      `Insufficient stock for item ${itemId}: requested ${requested}, available ${available}`,
    )
    this.name = 'InsufficientStockError'
  }
}

export class InvalidStockMovementError extends Error {
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
      input.itemId,
      normalizeQuantity(movementQuantity),
      normalizeQuantity(currentBalance),
    )
  }

  const movement: StockMovementRecord = {
    ...input,
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
