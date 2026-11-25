import { describe, expect, test } from 'vitest'

import { isValidEan13 } from '#/features/inventory/barcode.ts'
import { InMemoryItemRepository } from '#/features/inventory/inventory-store.ts'
import {
  assignMissingBarcodes,
  createItem,
  updateItem,
} from '#/features/inventory/item-service.ts'

const baseItem = {
  companyId: 'company-1',
  hsnCode: '6109',
  gstRate: '5.00',
  baseUnit: 'Piece',
  purchaseRate: '150.00',
  saleRate: '299.00',
  tracksInventory: true,
}

describe('item barcodes', () => {
  test('an item has no barcode unless one is given', async () => {
    const repository = new InMemoryItemRepository()

    const item = await createItem(repository, { ...baseItem, name: 'T-shirt' })

    expect(item.barcode).toBe('')
  })

  test('stores a manufacturer EAN-13, and a UPC-A in EAN-13 form', async () => {
    const repository = new InMemoryItemRepository()

    const ean = await createItem(repository, {
      ...baseItem,
      name: 'Shampoo',
      barcode: '5901234123457',
    })
    const upc = await createItem(repository, {
      ...baseItem,
      name: 'Soap',
      barcode: '036000291452',
    })

    expect(ean.barcode).toBe('5901234123457')
    expect(upc.barcode).toBe('0036000291452')
  })

  test('rejects a barcode with a wrong check digit', async () => {
    const repository = new InMemoryItemRepository()

    await expect(
      createItem(repository, {
        ...baseItem,
        name: 'Shampoo',
        barcode: '5901234123458',
      }),
    ).rejects.toThrow(/barcode/i)
  })

  test('rejects a barcode already used by another item in the company', async () => {
    const repository = new InMemoryItemRepository()
    await createItem(repository, {
      ...baseItem,
      name: 'Shampoo',
      barcode: '5901234123457',
    })

    await expect(
      createItem(repository, {
        ...baseItem,
        name: 'Conditioner',
        barcode: '5901234123457',
      }),
    ).rejects.toThrow(/Shampoo/)

    const otherCompany = await createItem(repository, {
      ...baseItem,
      companyId: 'company-2',
      name: 'Shampoo',
      barcode: '5901234123457',
    })
    expect(otherCompany.barcode).toBe('5901234123457')
  })

  test('updating an item keeps its barcode when none is sent', async () => {
    const repository = new InMemoryItemRepository()
    const item = await createItem(repository, {
      ...baseItem,
      name: 'Shampoo',
      barcode: '5901234123457',
    })

    const updated = await updateItem(repository, {
      ...baseItem,
      itemId: item.id,
      name: 'Shampoo 200ml',
    })
    const unchangedOwnCode = await updateItem(repository, {
      ...baseItem,
      itemId: item.id,
      name: 'Shampoo 200ml',
      barcode: '5901234123457',
    })

    expect(updated.barcode).toBe('5901234123457')
    expect(unchangedOwnCode.barcode).toBe('5901234123457')
  })
})

describe('assignMissingBarcodes', () => {
  test('gives in-store EAN-13 codes only to items that have none', async () => {
    const repository = new InMemoryItemRepository()
    const shirt = await createItem(repository, { ...baseItem, name: 'Shirt' })
    const jeans = await createItem(repository, { ...baseItem, name: 'Jeans' })
    const shampoo = await createItem(repository, {
      ...baseItem,
      name: 'Shampoo',
      barcode: '5901234123457',
    })

    const labelled = await assignMissingBarcodes(repository, {
      companyId: 'company-1',
      itemIds: [shirt.id, jeans.id, shampoo.id],
    })

    const byId = new Map(labelled.map((item) => [item.id, item]))
    expect(byId.get(shampoo.id)?.barcode).toBe('5901234123457')
    for (const id of [shirt.id, jeans.id]) {
      const code = byId.get(id)?.barcode ?? ''
      expect(code).toMatch(/^20\d{11}$/)
      expect(isValidEan13(code)).toBe(true)
      expect((await repository.findById(id))?.barcode).toBe(code)
    }
    expect(byId.get(shirt.id)?.barcode).not.toBe(byId.get(jeans.id)?.barcode)
  })

  test('refuses items from another company', async () => {
    const repository = new InMemoryItemRepository()
    const item = await createItem(repository, {
      ...baseItem,
      companyId: 'company-2',
      name: 'Shirt',
    })

    await expect(
      assignMissingBarcodes(repository, {
        companyId: 'company-1',
        itemIds: [item.id],
      }),
    ).rejects.toThrow(/Item not found/)
  })
})
