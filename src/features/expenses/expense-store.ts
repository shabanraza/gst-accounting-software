import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  ExpenseRecord,
  ExpenseRepository,
} from '#/features/expenses/expense-service.ts'

export class InMemoryExpenseRepository implements ExpenseRepository {
  private expenses: Array<ExpenseRecord> = []

  async create(expense: ExpenseRecord): Promise<ExpenseRecord> {
    this.expenses.push(expense)
    return expense
  }

  async listByCompanyId(companyId: string) {
    return this.expenses.filter((expense) => expense.companyId === companyId)
  }
}

type ExpenseRow = typeof schema.expenses.$inferSelect

function mapRowToExpenseRecord(row: ExpenseRow): ExpenseRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    expenseDate: row.expenseDate,
    narration: row.narration,
    amount: row.amount,
    taxableAmount: row.taxableAmount ?? row.amount,
    gstRate: row.gstRate,
    gstAmount: row.gstAmount,
    itcClaimed: row.itcClaimed,
    supplierName: row.supplierName,
    supplierGstin: row.supplierGstin,
    billNumber: row.billNumber,
    placeOfSupply: row.placeOfSupply,
    expenseAccountId: row.expenseAccountId,
    paymentAccountId: row.paymentAccountId,
    ledgerEntryId: row.ledgerEntryId,
    createdAt: row.createdAt,
  }
}

export class DrizzleExpenseRepository implements ExpenseRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(expense: ExpenseRecord) {
    const [created] = await this.database
      .insert(schema.expenses)
      .values({
        id: expense.id,
        companyId: expense.companyId,
        expenseDate: expense.expenseDate,
        narration: expense.narration,
        amount: expense.amount,
        taxableAmount: expense.taxableAmount,
        gstRate: expense.gstRate,
        gstAmount: expense.gstAmount,
        itcClaimed: expense.itcClaimed,
        supplierName: expense.supplierName,
        supplierGstin: expense.supplierGstin,
        billNumber: expense.billNumber,
        placeOfSupply: expense.placeOfSupply,
        expenseAccountId: expense.expenseAccountId,
        paymentAccountId: expense.paymentAccountId,
        ledgerEntryId: expense.ledgerEntryId,
        createdAt: expense.createdAt,
      })
      .returning()

    return mapRowToExpenseRecord(created)
  }

  async listByCompanyId(companyId: string) {
    const rows = await this.database
      .select()
      .from(schema.expenses)
      .where(eq(schema.expenses.companyId, companyId))

    return rows.map(mapRowToExpenseRecord)
  }
}

export function createExpenseRepository(): ExpenseRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryExpenseRepository()
  }

  return new DrizzleExpenseRepository(database)
}

export const expenseRepository = createExpenseRepository()
