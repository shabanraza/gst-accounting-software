import { and, eq, inArray } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  GrnRecord,
  GrnRepository,
} from '#/features/purchases/grn-service.ts'

export class InMemoryGrnRepository implements GrnRepository {
  private readonly grns: Array<GrnRecord> = []

  async create(grn: GrnRecord) {
    this.grns.push(grn)
    return grn
  }

  async listByCompanyId(companyId: string) {
    return this.grns.filter((grn) => grn.companyId === companyId)
  }

  async findById(companyId: string, grnId: string) {
    return (
      this.grns.find(
        (grn) => grn.companyId === companyId && grn.id === grnId,
      ) ?? null
    )
  }

  async markConverted(companyId: string, grnId: string, billId: string) {
    const grn = await this.findById(companyId, grnId)

    if (!grn) {
      throw new Error(`GRN not found: ${grnId}`)
    }

    grn.status = 'converted'
    grn.convertedToBillId = billId
    return grn
  }
}

type GrnRow = typeof schema.purchaseGrns.$inferSelect
type GrnLineRow = typeof schema.purchaseGrnLines.$inferSelect

function mapLineRow(row: GrnLineRow): GrnRecord['lines'][number] {
  return {
    id: row.id,
    purchaseOrderLineId: row.purchaseOrderLineId,
    itemId: row.itemId,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit,
    rate: row.rate,
    gstRate: row.gstRate,
  }
}

function mapGrnRow(row: GrnRow, lines: GrnRecord['lines']): GrnRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    purchaseOrderId: row.purchaseOrderId,
    supplierId: row.supplierId,
    grnNumber: row.grnNumber,
    grnDate: row.grnDate,
    status: row.status as GrnRecord['status'],
    convertedToBillId: row.convertedToBillId,
    narration: row.narration,
    godownName: row.godownName,
    totalAmount: row.totalAmount,
    lines,
    createdAt: row.createdAt,
  }
}

export class DrizzleGrnRepository implements GrnRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(grn: GrnRecord) {
    await this.database.insert(schema.purchaseGrns).values({
      id: grn.id,
      companyId: grn.companyId,
      purchaseOrderId: grn.purchaseOrderId,
      supplierId: grn.supplierId,
      grnNumber: grn.grnNumber,
      grnDate: grn.grnDate,
      status: grn.status,
      convertedToBillId: grn.convertedToBillId,
      narration: grn.narration,
      godownName: grn.godownName,
      totalAmount: grn.totalAmount,
      createdAt: grn.createdAt,
    })

    if (grn.lines.length > 0) {
      await this.database.insert(schema.purchaseGrnLines).values(
        grn.lines.map((line) => ({
          id: line.id,
          purchaseGrnId: grn.id,
          purchaseOrderLineId: line.purchaseOrderLineId,
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          rate: line.rate,
          gstRate: line.gstRate,
        })),
      )
    }

    return grn
  }

  async listByCompanyId(companyId: string) {
    const grns = await this.database
      .select()
      .from(schema.purchaseGrns)
      .where(eq(schema.purchaseGrns.companyId, companyId))

    if (grns.length === 0) {
      return []
    }

    const grnIds = grns.map((grn) => grn.id)
    const allLines = await this.database
      .select()
      .from(schema.purchaseGrnLines)
      .where(inArray(schema.purchaseGrnLines.purchaseGrnId, grnIds))

    const linesByGrnId = new Map<string, Array<GrnLineRow>>()
    for (const line of allLines) {
      const group = linesByGrnId.get(line.purchaseGrnId) ?? []
      group.push(line)
      linesByGrnId.set(line.purchaseGrnId, group)
    }

    return grns.map((grn) =>
      mapGrnRow(grn, (linesByGrnId.get(grn.id) ?? []).map(mapLineRow)),
    )
  }

  async findById(companyId: string, grnId: string) {
    const grns = await this.database
      .select()
      .from(schema.purchaseGrns)
      .where(
        and(
          eq(schema.purchaseGrns.companyId, companyId),
          eq(schema.purchaseGrns.id, grnId),
        ),
      )
      .limit(1)

    if (grns.length === 0) {
      return null
    }

    const lines = await this.database
      .select()
      .from(schema.purchaseGrnLines)
      .where(eq(schema.purchaseGrnLines.purchaseGrnId, grnId))

    return mapGrnRow(grns[0], lines.map(mapLineRow))
  }

  async markConverted(companyId: string, grnId: string, billId: string) {
    const updatedRows = await this.database
      .update(schema.purchaseGrns)
      .set({
        status: 'converted',
        convertedToBillId: billId,
      })
      .where(
        and(
          eq(schema.purchaseGrns.companyId, companyId),
          eq(schema.purchaseGrns.id, grnId),
        ),
      )
      .returning()

    if (updatedRows.length === 0) {
      throw new Error(`GRN not found: ${grnId}`)
    }

    const updated = updatedRows[0]

    const lines = await this.database
      .select()
      .from(schema.purchaseGrnLines)
      .where(eq(schema.purchaseGrnLines.purchaseGrnId, grnId))

    return mapGrnRow(updated, lines.map(mapLineRow))
  }
}

export function createGrnRepository(): GrnRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryGrnRepository()
  }

  return new DrizzleGrnRepository(database)
}

export const grnRepository = createGrnRepository()
