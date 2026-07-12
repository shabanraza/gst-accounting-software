import { and, eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type { TaxMode } from '#/features/accounting/voucher-math.ts'
import type {
  PurchaseBillRecord,
  PurchaseBillRepository,
} from '#/features/purchases/purchase-bill-service.ts'

export class InMemoryPurchaseBillRepository implements PurchaseBillRepository {
  private readonly bills: Array<PurchaseBillRecord> = []

  async findBySupplierBillNumber(input: {
    companyId: string
    supplierId: string
    supplierBillNumber: string
    financialYearStart: string
  }) {
    return (
      this.bills.find(
        (bill) =>
          bill.companyId === input.companyId &&
          bill.supplierId === input.supplierId &&
          bill.supplierBillNumber === input.supplierBillNumber &&
          bill.financialYearStart === input.financialYearStart,
      ) ?? null
    )
  }

  async create(bill: PurchaseBillRecord) {
    this.bills.push(bill)
    return bill
  }

  async findById(id: string) {
    return this.bills.find((bill) => bill.id === id) ?? null
  }

  async save(bill: PurchaseBillRecord) {
    const index = this.bills.findIndex((item) => item.id === bill.id)
    if (index >= 0) {
      this.bills[index] = bill
    }
    return bill
  }

  async listByCompanyId(companyId: string) {
    return this.bills.filter((bill) => bill.companyId === companyId)
  }
}

type PurchaseBillRow = typeof schema.purchaseBills.$inferSelect
type PurchaseBillLineRow = typeof schema.purchaseBillLines.$inferSelect

function mapRowsToPurchaseBillRecord(
  bill: PurchaseBillRow,
  lines: Array<PurchaseBillLineRow>,
): PurchaseBillRecord {
  return {
    id: bill.id,
    companyId: bill.companyId,
    financialYearStart: bill.financialYearStart,
    supplierId: bill.supplierId,
    supplierBillNumber: bill.supplierBillNumber,
    billDate: bill.billDate,
    dueDate: bill.dueDate,
    placeOfSupply: bill.placeOfSupply || '',
    reverseCharge: bill.reverseCharge,
    paymentStatus: bill.paymentStatus as PurchaseBillRecord['paymentStatus'],
    taxMode: bill.taxMode as TaxMode,
    narration: bill.narration || '',
    freight: bill.freight || '0.00',
    packing: bill.packing || '0.00',
    roundOff: bill.roundOff || '0.00',
    billDiscount: bill.billDiscount || '0.00',
    godownName: bill.godownName ?? null,
    taxableAmount: bill.taxableAmount,
    totalGstAmount: bill.totalGstAmount,
    totalAmount: bill.totalAmount,
    outstandingAmount: bill.outstandingAmount,
    ledgerEntryId: bill.ledgerEntryId,
    createdAt: bill.createdAt,
    lines: lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      gstRate: line.gstRate,
      discountPercent: line.discountPercent || '0.00',
      discountAmount: line.discountAmount || '0.00',
      taxableAmount: line.taxableAmount,
      gstAmount: line.gstAmount,
      lineTotal: line.lineTotal,
      godownName: line.godownName ?? null,
    })),
  }
}

export class DrizzlePurchaseBillRepository implements PurchaseBillRepository {
  constructor(private readonly database: AppDatabase) {}

  async findBySupplierBillNumber(input: {
    companyId: string
    supplierId: string
    supplierBillNumber: string
    financialYearStart: string
  }) {
    const bills = await this.database
      .select()
      .from(schema.purchaseBills)
      .where(
        and(
          eq(schema.purchaseBills.companyId, input.companyId),
          eq(schema.purchaseBills.supplierId, input.supplierId),
          eq(schema.purchaseBills.supplierBillNumber, input.supplierBillNumber),
          eq(schema.purchaseBills.financialYearStart, input.financialYearStart),
        ),
      )
      .limit(1)

    if (bills.length === 0) {
      return null
    }

    const lines = await this.database
      .select()
      .from(schema.purchaseBillLines)
      .where(eq(schema.purchaseBillLines.purchaseBillId, bills[0].id))

    return mapRowsToPurchaseBillRecord(bills[0], lines)
  }

  async create(bill: PurchaseBillRecord) {
    const [createdBill] = await this.database
      .insert(schema.purchaseBills)
      .values({
        id: bill.id,
        companyId: bill.companyId,
        financialYearStart: bill.financialYearStart,
        supplierId: bill.supplierId,
        supplierBillNumber: bill.supplierBillNumber,
        billDate: bill.billDate,
        dueDate: bill.dueDate,
        placeOfSupply: bill.placeOfSupply,
        reverseCharge: bill.reverseCharge,
        paymentStatus: bill.paymentStatus,
        taxMode: bill.taxMode,
        narration: bill.narration,
        freight: bill.freight,
        packing: bill.packing,
        roundOff: bill.roundOff,
        billDiscount: bill.billDiscount,
        godownName: bill.godownName,
        taxableAmount: bill.taxableAmount,
        totalGstAmount: bill.totalGstAmount,
        totalAmount: bill.totalAmount,
        outstandingAmount: bill.outstandingAmount,
        ledgerEntryId: bill.ledgerEntryId,
        createdAt: bill.createdAt,
      })
      .returning()

    const createdLines = await this.database
      .insert(schema.purchaseBillLines)
      .values(
        bill.lines.map((line) => ({
          id: line.id,
          purchaseBillId: bill.id,
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          rate: line.rate,
          gstRate: line.gstRate,
          discountPercent: line.discountPercent,
          discountAmount: line.discountAmount,
          godownName: line.godownName,
          taxableAmount: line.taxableAmount,
          gstAmount: line.gstAmount,
          lineTotal: line.lineTotal,
        })),
      )
      .returning()

    return mapRowsToPurchaseBillRecord(createdBill, createdLines)
  }

  async findById(id: string) {
    const bills = await this.database
      .select()
      .from(schema.purchaseBills)
      .where(eq(schema.purchaseBills.id, id))
      .limit(1)

    if (bills.length === 0) {
      return null
    }

    const lines = await this.database
      .select()
      .from(schema.purchaseBillLines)
      .where(eq(schema.purchaseBillLines.purchaseBillId, bills[0].id))

    return mapRowsToPurchaseBillRecord(bills[0], lines)
  }

  async save(bill: PurchaseBillRecord) {
    await this.database
      .update(schema.purchaseBills)
      .set({
        paymentStatus: bill.paymentStatus,
        outstandingAmount: bill.outstandingAmount,
      })
      .where(eq(schema.purchaseBills.id, bill.id))

    return bill
  }

  async listByCompanyId(companyId: string) {
    const bills = await this.database
      .select()
      .from(schema.purchaseBills)
      .where(eq(schema.purchaseBills.companyId, companyId))

    const results: Array<PurchaseBillRecord> = []
    for (const bill of bills) {
      const lines = await this.database
        .select()
        .from(schema.purchaseBillLines)
        .where(eq(schema.purchaseBillLines.purchaseBillId, bill.id))
      results.push(mapRowsToPurchaseBillRecord(bill, lines))
    }
    return results
  }
}

export function createPurchaseBillRepository(): PurchaseBillRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryPurchaseBillRepository()
  }

  return new DrizzlePurchaseBillRepository(database)
}

export const purchaseBillRepository = createPurchaseBillRepository()
