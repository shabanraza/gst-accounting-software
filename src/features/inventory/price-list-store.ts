import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  PriceListItemRecord,
  PriceListItemRepository,
  PriceListRecord,
  PriceListRepository,
} from '#/features/inventory/price-list-service.ts'

export class InMemoryPriceListRepository
  implements PriceListRepository, PriceListItemRepository
{
  private readonly priceLists: Array<PriceListRecord> = []
  private readonly items: Array<PriceListItemRecord> = []

  async findByCompanyAndName(companyId: string, name: string) {
    return (
      this.priceLists.find(
        (list) => list.companyId === companyId && list.name === name,
      ) ?? null
    )
  }

  async create(priceList: PriceListRecord) {
    this.priceLists.push(priceList)
    return priceList
  }

  async listByCompanyId(companyId: string) {
    return this.priceLists.filter((list) => list.companyId === companyId)
  }

  async upsertItemRate(input: {
    priceListId: string
    itemId: string
    rate: string
  }) {
    const existing = this.items.find(
      (item) =>
        item.priceListId === input.priceListId && item.itemId === input.itemId,
    )

    if (existing) {
      existing.rate = input.rate
      return existing
    }

    const created: PriceListItemRecord = {
      id: crypto.randomUUID(),
      priceListId: input.priceListId,
      itemId: input.itemId,
      rate: input.rate,
    }
    this.items.push(created)
    return created
  }

  async listByPriceListId(priceListId: string) {
    return this.items.filter((item) => item.priceListId === priceListId)
  }

  async findItemRate(priceListId: string, itemId: string) {
    return (
      this.items.find(
        (item) => item.priceListId === priceListId && item.itemId === itemId,
      ) ?? null
    )
  }
}

type PriceListRow = typeof schema.priceLists.$inferSelect
type PriceListItemRow = typeof schema.priceListItems.$inferSelect

function mapRowToPriceListRecord(row: PriceListRow): PriceListRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    createdAt: row.createdAt,
  }
}

function mapRowToPriceListItemRecord(
  row: PriceListItemRow,
): PriceListItemRecord {
  return {
    id: row.id,
    priceListId: row.priceListId,
    itemId: row.itemId,
    rate: row.rate,
  }
}

export class DrizzlePriceListRepository
  implements PriceListRepository, PriceListItemRepository
{
  constructor(private readonly database: AppDatabase) {}

  async findByCompanyAndName(companyId: string, name: string) {
    const priceLists = await this.database
      .select()
      .from(schema.priceLists)
      .where(
        and(
          eq(schema.priceLists.companyId, companyId),
          eq(schema.priceLists.name, name),
        ),
      )
      .limit(1)

    if (priceLists.length === 0) {
      return null
    }

    return mapRowToPriceListRecord(priceLists[0])
  }

  async create(priceList: PriceListRecord) {
    const [createdPriceList] = await this.database
      .insert(schema.priceLists)
      .values({
        id: priceList.id,
        companyId: priceList.companyId,
        name: priceList.name,
        createdAt: priceList.createdAt,
      })
      .returning()

    return mapRowToPriceListRecord(createdPriceList)
  }

  async listByCompanyId(companyId: string) {
    const priceLists = await this.database
      .select()
      .from(schema.priceLists)
      .where(eq(schema.priceLists.companyId, companyId))

    return priceLists.map(mapRowToPriceListRecord)
  }

  async upsertItemRate(input: {
    priceListId: string
    itemId: string
    rate: string
  }) {
    const existing = await this.database
      .select()
      .from(schema.priceListItems)
      .where(
        and(
          eq(schema.priceListItems.priceListId, input.priceListId),
          eq(schema.priceListItems.itemId, input.itemId),
        ),
      )
      .limit(1)

    if (existing.length === 0) {
      const [created] = await this.database
        .insert(schema.priceListItems)
        .values({
          id: crypto.randomUUID(),
          priceListId: input.priceListId,
          itemId: input.itemId,
          rate: input.rate,
        })
        .returning()

      return mapRowToPriceListItemRecord(created)
    }

    const [updated] = await this.database
      .update(schema.priceListItems)
      .set({ rate: input.rate })
      .where(eq(schema.priceListItems.id, existing[0].id))
      .returning()

    return mapRowToPriceListItemRecord(updated)
  }

  async listByPriceListId(priceListId: string) {
    const items = await this.database
      .select()
      .from(schema.priceListItems)
      .where(eq(schema.priceListItems.priceListId, priceListId))

    return items.map(mapRowToPriceListItemRecord)
  }

  async findItemRate(priceListId: string, itemId: string) {
    const items = await this.database
      .select()
      .from(schema.priceListItems)
      .where(
        and(
          eq(schema.priceListItems.priceListId, priceListId),
          eq(schema.priceListItems.itemId, itemId),
        ),
      )
      .limit(1)

    if (items.length === 0) {
      return null
    }

    return mapRowToPriceListItemRecord(items[0])
  }
}

export function createPriceListRepository(): PriceListRepository &
  PriceListItemRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryPriceListRepository()
  }

  return new DrizzlePriceListRepository(database)
}

export const priceListRepository = createPriceListRepository()
