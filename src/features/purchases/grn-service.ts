import Decimal from 'decimal.js'

import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'

import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  PurchaseOrderRecord,
  PurchaseOrderRepository,
} from '#/features/purchases/purchase-order-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

export type GrnStatus = 'open' | 'converted' | 'cancelled'

export type GrnLineInput = {
  purchaseOrderLineId?: string | null
  itemId: string
  description: string
  quantity: string
  unit: string
  rate: string
  gstRate: string
}

export type GrnLineRecord = GrnLineInput & {
  id: string
}

export type CreateGrnInput = {
  companyId: string
  purchaseOrderId?: string | null
  supplierId: string
  grnNumber: string
  grnDate: string
  narration?: string
  godownName?: string | null
  lines: Array<GrnLineInput>
}

export type GrnRecord = {
  id: string
  companyId: string
  purchaseOrderId: string | null
  supplierId: string
  grnNumber: string
  grnDate: string
  status: GrnStatus
  convertedToBillId: string | null
  narration: string
  godownName: string | null
  totalAmount: string
  lines: Array<GrnLineRecord>
  createdAt: Date
}

export type PurchaseBillDraftFromGrn = {
  sourceGrnId: string
  supplierId: string
  grnDate: string
  narration: string
  godownName: string | null
  lines: Array<{
    itemId: string
    itemName: string
    hsnCode: string
    gstRate: string
    quantity: string
    unit: string
    rate: string
  }>
}

export interface GrnRepository {
  create: (grn: GrnRecord) => Promise<GrnRecord>
  listByCompanyId: (companyId: string) => Promise<Array<GrnRecord>>
  findById: (companyId: string, grnId: string) => Promise<GrnRecord | null>
  markConverted: (
    companyId: string,
    grnId: string,
    billId: string,
  ) => Promise<GrnRecord>
}

export class InvalidGrnError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidGrnError'
  }
}

export class GrnNotFoundError extends Error {
  constructor(grnId: string) {
    super(`GRN not found: ${grnId}`)
    this.name = 'GrnNotFoundError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function computeTotalAmount(lines: Array<GrnLineInput>): string {
  return lines
    .reduce(
      (sum, line) => sum.plus(new Decimal(line.quantity).mul(line.rate)),
      new Decimal(0),
    )
    .toFixed(2)
}

export async function createGrn(
  repository: GrnRepository,
  input: CreateGrnInput,
): Promise<GrnRecord> {
  if (input.lines.length === 0) {
    throw new InvalidGrnError('GRN requires at least one line')
  }

  const lines: Array<GrnLineRecord> = input.lines.map((line) => ({
    ...line,
    id: crypto.randomUUID(),
    purchaseOrderLineId: line.purchaseOrderLineId ?? null,
  }))

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    purchaseOrderId: input.purchaseOrderId ?? null,
    supplierId: input.supplierId,
    grnNumber: input.grnNumber.trim(),
    grnDate: input.grnDate,
    status: 'open',
    convertedToBillId: null,
    narration: input.narration?.trim() ?? '',
    godownName: input.godownName ?? null,
    totalAmount: computeTotalAmount(lines),
    lines,
    createdAt: new Date(),
  })
}

export async function listGrnsByCompany(
  repository: GrnRepository,
  companyId: string,
): Promise<Array<GrnRecord>> {
  return repository.listByCompanyId(companyId)
}

export async function getGrnById(
  repository: GrnRepository,
  companyId: string,
  grnId: string,
): Promise<GrnRecord> {
  const grn = await repository.findById(companyId, grnId)

  if (!grn) {
    throw new GrnNotFoundError(grnId)
  }

  return grn
}

export async function createGrnFromPurchaseOrder(
  grnRepository: GrnRepository,
  purchaseOrderRepository: PurchaseOrderRepository,
  stockStore: StockMovementRepository & StockBalanceRepository,
  input: {
    companyId: string
    purchaseOrderId: string
    grnNumber: string
    grnDate: string
    godownName?: string | null
    narration?: string
  },
): Promise<GrnRecord> {
  const order = await purchaseOrderRepository.findById(
    input.companyId,
    input.purchaseOrderId,
  )

  if (!order) {
    throw new InvalidGrnError(`Purchase order not found: ${input.purchaseOrderId}`)
  }

  if (order.status !== 'open') {
    throw new InvalidGrnError('Only open purchase orders can be received')
  }

  const grn = await createGrn(grnRepository, {
    companyId: input.companyId,
    purchaseOrderId: order.id,
    supplierId: order.supplierId,
    grnNumber: input.grnNumber,
    grnDate: input.grnDate,
    narration: input.narration ?? order.narration,
    godownName: input.godownName ?? null,
    lines: order.lines.map((line) => ({
      purchaseOrderLineId: line.id,
      itemId: line.itemId,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      gstRate: line.gstRate,
    })),
  })

  for (const line of grn.lines) {
    await recordStockMovement(stockStore, stockStore, {
      companyId: input.companyId,
      itemId: line.itemId,
      movementType: 'purchase_in',
      quantity: line.quantity,
      unit: line.unit,
      referenceType: 'grn',
      referenceId: grn.id,
      occurredOn: input.grnDate,
      godownName: grn.godownName,
    })
  }

  await purchaseOrderRepository.updateStatus(
    input.companyId,
    order.id,
    'closed',
  )

  return grn
}

export async function buildPurchaseBillDraftFromGrn(
  grnRepository: GrnRepository,
  itemRepository: ItemRepository,
  companyId: string,
  grnId: string,
): Promise<PurchaseBillDraftFromGrn> {
  const grn = await getGrnById(grnRepository, companyId, grnId)

  if (grn.status === 'converted') {
    throw new InvalidGrnError('This GRN has already been converted to a bill')
  }

  const items = await itemRepository.listByCompanyId(companyId)
  const itemById = new Map(items.map((item) => [item.id, item]))

  const lines = grn.lines.map((line) => {
    const item = itemById.get(line.itemId)

    if (!item) {
      throw new InvalidGrnError(`Item not found for GRN line: ${line.itemId}`)
    }

    return {
      itemId: line.itemId,
      itemName: line.description || item.name,
      hsnCode: item.hsnCode,
      gstRate: line.gstRate,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
    }
  })

  return {
    sourceGrnId: grn.id,
    supplierId: grn.supplierId,
    grnDate: grn.grnDate,
    narration: grn.narration,
    godownName: grn.godownName,
    lines,
  }
}

export async function markGrnConverted(
  repository: GrnRepository,
  companyId: string,
  grnId: string,
  billId: string,
): Promise<GrnRecord> {
  return repository.markConverted(companyId, grnId, billId)
}

export function mapPurchaseOrderToGrnLines(
  order: PurchaseOrderRecord,
): Array<GrnLineInput> {
  return order.lines.map((line) => ({
    purchaseOrderLineId: line.id,
    itemId: line.itemId,
    description: line.description,
    quantity: line.quantity,
    unit: line.unit,
    rate: line.rate,
    gstRate: line.gstRate,
  }))
}
