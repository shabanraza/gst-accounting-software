import { describe, expect, test } from 'vitest'

import {
  createPurchaseOrder,
} from '#/features/purchases/purchase-order-service.ts'
import type {
  PurchaseOrderRecord,
  PurchaseOrderRepository,
} from '#/features/purchases/purchase-order-service.ts'

class InMemoryPurchaseOrderRepository implements PurchaseOrderRepository {
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

describe('createPurchaseOrder', () => {
  test('stores open PO without ledger posting', async () => {
    const repo = new InMemoryPurchaseOrderRepository()
    const order = await createPurchaseOrder(repo, {
      companyId: 'c1',
      supplierId: 'sup-1',
      orderNumber: 'PO-0001',
      orderDate: '2026-04-12',
      lines: [
        {
          itemId: 'item-1',
          description: 'Cotton',
          quantity: '100',
          unit: 'Meter',
          rate: '80.00',
          gstRate: '12.00',
        },
      ],
    })

    expect(order.status).toBe('open')
    expect(order.totalAmount).toBe('8000.00')
    expect(order.lines[0]?.lineTotal).toBe('8000.00')
  })
})
