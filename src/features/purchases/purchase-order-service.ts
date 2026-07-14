import Decimal from 'decimal.js'

export type PurchaseOrderStatus = 'open' | 'closed' | 'cancelled'

export type PurchaseOrderLineInput = {
  itemId: string
  description: string
  quantity: string
  unit: string
  rate: string
  gstRate: string
}

export type CreatePurchaseOrderInput = {
  companyId: string
  supplierId: string
  orderNumber: string
  orderDate: string
  narration?: string
  lines: Array<PurchaseOrderLineInput>
}

export type PurchaseOrderLineRecord = PurchaseOrderLineInput & {
  id: string
  lineTotal: string
}

export type PurchaseOrderRecord = {
  id: string
  companyId: string
  supplierId: string
  orderNumber: string
  orderDate: string
  status: PurchaseOrderStatus
  narration: string
  totalAmount: string
  lines: Array<PurchaseOrderLineRecord>
  createdAt: Date
}

export interface PurchaseOrderRepository {
  create: (order: PurchaseOrderRecord) => Promise<PurchaseOrderRecord>
  listByCompanyId: (companyId: string) => Promise<Array<PurchaseOrderRecord>>
  findById: (
    companyId: string,
    orderId: string,
  ) => Promise<PurchaseOrderRecord | null>
  updateStatus: (
    companyId: string,
    orderId: string,
    status: PurchaseOrderStatus,
  ) => Promise<PurchaseOrderRecord>
}

export class InvalidPurchaseOrderError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidPurchaseOrderError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export async function createPurchaseOrder(
  repository: PurchaseOrderRepository,
  input: CreatePurchaseOrderInput,
): Promise<PurchaseOrderRecord> {
  if (input.lines.length === 0) {
    throw new InvalidPurchaseOrderError(
      'Purchase order requires at least one line',
    )
  }

  const lines: Array<PurchaseOrderLineRecord> = input.lines.map((line) => {
    const lineTotal = new Decimal(line.quantity).mul(line.rate).toFixed(2)
    return {
      ...line,
      id: crypto.randomUUID(),
      lineTotal,
    }
  })

  const totalAmount = lines
    .reduce((sum, line) => sum.plus(line.lineTotal), new Decimal(0))
    .toFixed(2)

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    supplierId: input.supplierId,
    orderNumber: input.orderNumber.trim(),
    orderDate: input.orderDate,
    status: 'open',
    narration: input.narration?.trim() ?? '',
    totalAmount,
    lines,
    createdAt: new Date(),
  })
}

export async function listPurchaseOrdersByCompany(
  repository: PurchaseOrderRepository,
  companyId: string,
) {
  return repository.listByCompanyId(companyId)
}

export async function getPurchaseOrderById(
  repository: PurchaseOrderRepository,
  companyId: string,
  orderId: string,
) {
  const order = await repository.findById(companyId, orderId)

  if (!order) {
    throw new InvalidPurchaseOrderError(`Purchase order not found: ${orderId}`)
  }

  return order
}
