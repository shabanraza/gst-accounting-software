import { describe, expect, test } from 'vitest'

import { createItem } from '#/features/inventory/item-service.ts'
import { InMemoryItemRepository, InMemoryStockStore } from '#/features/inventory/inventory-store.ts'
import {
  buildPurchaseBillDraftFromGrn,
  createGrnFromPurchaseOrder,
} from '#/features/purchases/grn-service.ts'
import { createPurchaseOrder } from '#/features/purchases/purchase-order-service.ts'
import { InMemoryPurchaseOrderRepository } from '#/features/purchases/purchase-order-store.ts'
import { InMemoryGrnRepository } from '#/features/purchases/grn-store.ts'

describe('createGrnFromPurchaseOrder', () => {
  test('receives goods from an open PO and closes the order', async () => {
    const orders = new InMemoryPurchaseOrderRepository()
    const grns = new InMemoryGrnRepository()
    const stock = new InMemoryStockStore()

    const order = await createPurchaseOrder(orders, {
      companyId: 'company-1',
      supplierId: 'supplier-1',
      orderNumber: 'PO-0001',
      orderDate: '2026-07-12',
      lines: [
        {
          itemId: 'item-1',
          description: 'Widget',
          quantity: '10',
          unit: 'pcs',
          rate: '50.00',
          gstRate: '18.00',
        },
      ],
    })

    const grn = await createGrnFromPurchaseOrder(grns, orders, stock, {
      companyId: 'company-1',
      purchaseOrderId: order.id,
      grnNumber: 'GRN-0001',
      grnDate: '2026-07-13',
      godownName: 'Main',
    })

    expect(grn.totalAmount).toBe('500.00')
    expect(grn.lines).toHaveLength(1)

    const updatedOrder = await orders.findById('company-1', order.id)
    expect(updatedOrder?.status).toBe('closed')

    const balance = await stock.getBalance('company-1', 'item-1')
    expect(balance).toBe('10')
  })
})

describe('buildPurchaseBillDraftFromGrn', () => {
  test('maps GRN lines into a purchase bill draft', async () => {
    const grns = new InMemoryGrnRepository()
    const items = new InMemoryItemRepository()

    const item = await createItem(items, {
      companyId: 'company-1',
      name: 'Widget',
      hsnCode: '8471',
      gstRate: '18.00',
      baseUnit: 'pcs',
      purchaseRate: '50.00',
      saleRate: '70.00',
      tracksInventory: true,
    })

    await grns.create({
      id: 'grn-1',
      companyId: 'company-1',
      purchaseOrderId: 'po-1',
      supplierId: 'supplier-1',
      grnNumber: 'GRN-0001',
      grnDate: '2026-07-13',
      status: 'open',
      convertedToBillId: null,
      narration: 'Received',
      godownName: 'Main',
      totalAmount: '500.00',
      lines: [
        {
          id: 'line-1',
          purchaseOrderLineId: 'po-line-1',
          itemId: item.id,
          description: 'Widget',
          quantity: '10',
          unit: 'pcs',
          rate: '50.00',
          gstRate: '18.00',
        },
      ],
      createdAt: new Date(),
    })

    const draft = await buildPurchaseBillDraftFromGrn(
      grns,
      items,
      'company-1',
      'grn-1',
    )

    expect(draft.supplierId).toBe('supplier-1')
    expect(draft.lines[0]?.hsnCode).toBe('8471')
    expect(draft.godownName).toBe('Main')
  })
})
