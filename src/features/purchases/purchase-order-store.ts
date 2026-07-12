import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  PurchaseOrderRecord,
  PurchaseOrderRepository,
} from '#/features/purchases/purchase-order-service.ts'

export class InMemoryPurchaseOrderRepository implements PurchaseOrderRepository {
  private orders: Array<PurchaseOrderRecord> = []

  async create(order: PurchaseOrderRecord) {
    this.orders.push(order)
    return order
  }

  async listByCompanyId(companyId: string) {
    return this.orders.filter((order) => order.companyId === companyId)
  }

  async findById(companyId: string, orderId: string) {
    return (
      this.orders.find(
        (order) => order.companyId === companyId && order.id === orderId,
      ) ?? null
    )
  }

  async updateStatus(
    companyId: string,
    orderId: string,
    status: PurchaseOrderRecord['status'],
  ) {
    const order = await this.findById(companyId, orderId)

    if (!order) {
      throw new Error(`Purchase order not found: ${orderId}`)
    }

    order.status = status
    return order
  }
}

type OrderRow = typeof schema.purchaseOrders.$inferSelect
type LineRow = typeof schema.purchaseOrderLines.$inferSelect

function mapOrderRow(
  row: OrderRow,
  lines: PurchaseOrderRecord['lines'],
): PurchaseOrderRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    supplierId: row.supplierId,
    orderNumber: row.orderNumber,
    orderDate: row.orderDate,
    status: row.status as PurchaseOrderRecord['status'],
    narration: row.narration,
    totalAmount: row.totalAmount,
    lines,
    createdAt: row.createdAt,
  }
}

export class DrizzlePurchaseOrderRepository implements PurchaseOrderRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(order: PurchaseOrderRecord) {
    await this.database.insert(schema.purchaseOrders).values({
      id: order.id,
      companyId: order.companyId,
      supplierId: order.supplierId,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      status: order.status,
      narration: order.narration,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
    })

    if (order.lines.length > 0) {
      await this.database.insert(schema.purchaseOrderLines).values(
        order.lines.map((line) => ({
          id: line.id,
          purchaseOrderId: order.id,
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          rate: line.rate,
          gstRate: line.gstRate,
        })),
      )
    }

    return order
  }

  async listByCompanyId(companyId: string) {
    const orders = await this.database
      .select()
      .from(schema.purchaseOrders)
      .where(eq(schema.purchaseOrders.companyId, companyId))

    const results: Array<PurchaseOrderRecord> = []
    for (const order of orders) {
      const lines = await this.database
        .select()
        .from(schema.purchaseOrderLines)
        .where(eq(schema.purchaseOrderLines.purchaseOrderId, order.id))

      results.push(
        mapOrderRow(
          order,
          lines.map((line) => ({
            id: line.id,
            itemId: line.itemId,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            rate: line.rate,
            gstRate: line.gstRate,
          })),
        ),
      )
    }

    return results
  }

  async findById(companyId: string, orderId: string) {
    const orders = await this.database
      .select()
      .from(schema.purchaseOrders)
      .where(
        and(
          eq(schema.purchaseOrders.companyId, companyId),
          eq(schema.purchaseOrders.id, orderId),
        ),
      )
      .limit(1)

    if (orders.length === 0) {
      return null
    }

    const lines = await this.database
      .select()
      .from(schema.purchaseOrderLines)
      .where(eq(schema.purchaseOrderLines.purchaseOrderId, orderId))

    return mapOrderRow(
      orders[0],
      lines.map((line) => ({
        id: line.id,
        itemId: line.itemId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        rate: line.rate,
        gstRate: line.gstRate,
      })),
    )
  }

  async updateStatus(
    companyId: string,
    orderId: string,
    status: PurchaseOrderRecord['status'],
  ) {
    const updatedRows = await this.database
      .update(schema.purchaseOrders)
      .set({ status })
      .where(
        and(
          eq(schema.purchaseOrders.companyId, companyId),
          eq(schema.purchaseOrders.id, orderId),
        ),
      )
      .returning()

    if (updatedRows.length === 0) {
      throw new Error(`Purchase order not found: ${orderId}`)
    }

    const updated = updatedRows[0]

    const lines = await this.database
      .select()
      .from(schema.purchaseOrderLines)
      .where(eq(schema.purchaseOrderLines.purchaseOrderId, orderId))

    return mapOrderRow(
      updated,
      lines.map((line) => ({
        id: line.id,
        itemId: line.itemId,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        rate: line.rate,
        gstRate: line.gstRate,
      })),
    )
  }
}

export function createPurchaseOrderRepository(): PurchaseOrderRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryPurchaseOrderRepository()
  }

  return new DrizzlePurchaseOrderRepository(database)
}

export const purchaseOrderRepository = createPurchaseOrderRepository()
