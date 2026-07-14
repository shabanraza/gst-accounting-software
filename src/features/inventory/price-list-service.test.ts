import { describe, expect, test } from 'vitest'

import {
  DuplicatePriceListNameError,
  InvalidPriceListError,
  createPriceList,
  listPriceListItems,
  resolveItemRateForVoucher,
  setPriceListItemRate,
} from '#/features/inventory/price-list-service.ts'
import { InMemoryPriceListRepository } from '#/features/inventory/price-list-store.ts'

describe('createPriceList', () => {
  test('creates a price list for a company', async () => {
    const repository = new InMemoryPriceListRepository()

    const priceList = await createPriceList(repository, {
      companyId: 'company-1',
      name: 'Wholesale',
    })

    expect(priceList.name).toBe('Wholesale')
    expect(priceList.companyId).toBe('company-1')
  })

  test('rejects duplicate price list names within a company', async () => {
    const repository = new InMemoryPriceListRepository()

    await createPriceList(repository, {
      companyId: 'company-1',
      name: 'Wholesale',
    })

    await expect(
      createPriceList(repository, {
        companyId: 'company-1',
        name: 'Wholesale',
      }),
    ).rejects.toBeInstanceOf(DuplicatePriceListNameError)
  })
})

describe('setPriceListItemRate', () => {
  test('creates then updates a rate for an item on a price list', async () => {
    const repository = new InMemoryPriceListRepository()
    const priceList = await createPriceList(repository, {
      companyId: 'company-1',
      name: 'Wholesale',
    })

    await setPriceListItemRate(repository, {
      priceListId: priceList.id,
      itemId: 'item-1',
      rate: '100',
    })
    await setPriceListItemRate(repository, {
      priceListId: priceList.id,
      itemId: 'item-1',
      rate: '110.5',
    })

    const items = await listPriceListItems(repository, priceList.id)
    expect(items).toHaveLength(1)
    expect(items[0]?.rate).toBe('110.50')
  })

  test('rejects a negative rate', async () => {
    const repository = new InMemoryPriceListRepository()

    await expect(
      setPriceListItemRate(repository, {
        priceListId: 'list-1',
        itemId: 'item-1',
        rate: '-5',
      }),
    ).rejects.toBeInstanceOf(InvalidPriceListError)
  })
})

describe('resolveItemRateForVoucher', () => {
  test('uses price list rate when configured', async () => {
    const repository = new InMemoryPriceListRepository()
    const priceList = await createPriceList(repository, {
      companyId: 'company-1',
      name: 'Retail',
    })

    await setPriceListItemRate(repository, {
      priceListId: priceList.id,
      itemId: 'item-1',
      rate: '145.00',
    })

    const rate = await resolveItemRateForVoucher(repository, {
      priceListId: priceList.id,
      itemId: 'item-1',
      mode: 'sales',
      saleRate: '120.00',
      purchaseRate: '90.00',
    })

    expect(rate).toBe('145.00')
  })

  test('falls back to item master rate when price list entry is missing', async () => {
    const repository = new InMemoryPriceListRepository()
    const priceList = await createPriceList(repository, {
      companyId: 'company-1',
      name: 'Retail',
    })

    const rate = await resolveItemRateForVoucher(repository, {
      priceListId: priceList.id,
      itemId: 'item-1',
      mode: 'purchase',
      saleRate: '120.00',
      purchaseRate: '90.00',
    })

    expect(rate).toBe('90.00')
  })
})
