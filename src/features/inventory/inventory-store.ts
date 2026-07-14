import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  ItemRecord,
  ItemRepository,
} from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRecord,
  StockMovementRepository,
  StockMovementType,
  StockMovementDirection,
} from '#/features/inventory/stock-movement-service.ts'

export class InMemoryItemRepository implements ItemRepository {
  private readonly items: Array<ItemRecord> = []

  async create(item: ItemRecord) {
    this.items.push(item)
    return item
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null
  }

  async listByCompanyId(companyId: string) {
    return this.items.filter((item) => item.companyId === companyId)
  }
}

export class InMemoryStockStore
  implements StockMovementRepository, StockBalanceRepository
{
  private readonly movements: Array<StockMovementRecord> = []
  private readonly balances = new Map<string, string>()

  private key(companyId: string, itemId: string) {
    return `${companyId}:${itemId}`
  }

  async createMovement(movement: StockMovementRecord) {
    this.movements.push(movement)
    return movement
  }

  async listByCompanyId(companyId: string) {
    return this.movements.filter((movement) => movement.companyId === companyId)
  }

  async getBalance(companyId: string, itemId: string) {
    return this.balances.get(this.key(companyId, itemId)) ?? '0'
  }

  async setBalance(companyId: string, itemId: string, quantity: string) {
    this.balances.set(this.key(companyId, itemId), quantity)
  }

  async listBalancesByCompany(companyId: string) {
    return [...this.balances.entries()]
      .filter(([key]) => key.startsWith(`${companyId}:`))
      .map(([key, quantity]) => ({
        companyId,
        itemId: key.slice(companyId.length + 1),
        quantity,
      }))
  }
}

type ItemRow = typeof schema.items.$inferSelect
type StockMovementRow = typeof schema.stockMovements.$inferSelect

function mapRowToItemRecord(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    alias: row.alias,
    itemGroup: row.itemGroup,
    hsnCode: row.hsnCode,
    gstRate: row.gstRate,
    baseUnit: row.baseUnit,
    alternateUnit: row.alternateUnit,
    conversionFactor: row.conversionFactor,
    mrp: row.mrp,
    reorderLevel: row.reorderLevel,
    purchaseRate: row.purchaseRate,
    saleRate: row.saleRate,
    tracksInventory: row.tracksInventory,
    createdAt: row.createdAt,
  }
}

function mapRowToStockMovementRecord(
  row: StockMovementRow,
): StockMovementRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    itemId: row.itemId,
    movementType: row.movementType as StockMovementType,
    direction: row.direction as StockMovementDirection,
    quantity: row.quantity,
    unit: row.unit,
    referenceType: row.referenceType,
    referenceId: row.referenceId,
    occurredOn: row.occurredOn,
    godownName: row.godownName ?? null,
    createdAt: row.createdAt,
  }
}

export class DrizzleItemRepository implements ItemRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(item: ItemRecord) {
    const [createdItem] = await this.database
      .insert(schema.items)
      .values({
        id: item.id,
        companyId: item.companyId,
        name: item.name,
        alias: item.alias,
        itemGroup: item.itemGroup,
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
        baseUnit: item.baseUnit,
        alternateUnit: item.alternateUnit,
        conversionFactor: item.conversionFactor,
        mrp: item.mrp,
        reorderLevel: item.reorderLevel,
        purchaseRate: item.purchaseRate,
        saleRate: item.saleRate,
        tracksInventory: item.tracksInventory,
        createdAt: item.createdAt,
      })
      .returning()

    return mapRowToItemRecord(createdItem)
  }

  async findById(id: string) {
    const items = await this.database
      .select()
      .from(schema.items)
      .where(eq(schema.items.id, id))
      .limit(1)

    if (items.length === 0) {
      return null
    }

    return mapRowToItemRecord(items[0])
  }

  async listByCompanyId(companyId: string) {
    const items = await this.database
      .select()
      .from(schema.items)
      .where(eq(schema.items.companyId, companyId))

    return items.map(mapRowToItemRecord)
  }
}

export class DrizzleStockStore
  implements StockMovementRepository, StockBalanceRepository
{
  constructor(private readonly database: AppDatabase) {}

  async createMovement(movement: StockMovementRecord) {
    const [createdMovement] = await this.database
      .insert(schema.stockMovements)
      .values({
        id: movement.id,
        companyId: movement.companyId,
        itemId: movement.itemId,
        godownName: movement.godownName,
        movementType: movement.movementType,
        direction: movement.direction,
        quantity: movement.quantity,
        unit: movement.unit,
        referenceType: movement.referenceType,
        referenceId: movement.referenceId,
        occurredOn: movement.occurredOn,
        createdAt: movement.createdAt,
      })
      .returning()

    return mapRowToStockMovementRecord(createdMovement)
  }

  async listByCompanyId(companyId: string) {
    const movements = await this.database
      .select()
      .from(schema.stockMovements)
      .where(eq(schema.stockMovements.companyId, companyId))

    return movements.map(mapRowToStockMovementRecord)
  }

  async getBalance(companyId: string, itemId: string) {
    const balances = await this.database
      .select()
      .from(schema.stockBalances)
      .where(
        and(
          eq(schema.stockBalances.companyId, companyId),
          eq(schema.stockBalances.itemId, itemId),
        ),
      )
      .limit(1)

    return balances[0]?.quantity ?? '0'
  }

  async setBalance(companyId: string, itemId: string, quantity: string) {
    const existing = await this.database
      .select()
      .from(schema.stockBalances)
      .where(
        and(
          eq(schema.stockBalances.companyId, companyId),
          eq(schema.stockBalances.itemId, itemId),
        ),
      )
      .limit(1)

    if (existing.length === 0) {
      await this.database.insert(schema.stockBalances).values({
        companyId,
        itemId,
        quantity,
        updatedAt: new Date(),
      })
      return
    }

    await this.database
      .update(schema.stockBalances)
      .set({ quantity, updatedAt: new Date() })
      .where(eq(schema.stockBalances.id, existing[0].id))
  }

  async listBalancesByCompany(companyId: string) {
    const balances = await this.database
      .select()
      .from(schema.stockBalances)
      .where(eq(schema.stockBalances.companyId, companyId))

    return balances.map((balance) => ({
      companyId: balance.companyId,
      itemId: balance.itemId,
      quantity: balance.quantity,
    }))
  }
}

export function createItemRepository(): ItemRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryItemRepository()
  }

  return new DrizzleItemRepository(database)
}

export function createStockStore(): StockMovementRepository &
  StockBalanceRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryStockStore()
  }

  return new DrizzleStockStore(database)
}

export const itemRepository = createItemRepository()
export const stockStore = createStockStore()
