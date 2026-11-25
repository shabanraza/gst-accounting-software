import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  PaymentDocumentType,
  PaymentVoucherAllocationRecord,
  PaymentVoucherKind,
  PaymentVoucherListOptions,
  PaymentVoucherMode,
  PaymentVoucherRecord,
  PaymentVoucherRepository,
  PaymentVoucherStatus,
} from '#/features/payments/payment-voucher-service.ts'

function byNewestFirst(a: PaymentVoucherRecord, b: PaymentVoucherRecord) {
  if (a.voucherDate !== b.voucherDate) {
    return a.voucherDate < b.voucherDate ? 1 : -1
  }
  return b.createdAt.getTime() - a.createdAt.getTime()
}

export class InMemoryPaymentVoucherRepository implements PaymentVoucherRepository {
  private vouchers: Array<PaymentVoucherRecord> = []

  async create(voucher: PaymentVoucherRecord) {
    this.vouchers.push(structuredClone(voucher))
    return voucher
  }

  async findById(companyId: string, id: string) {
    const voucher = this.vouchers.find(
      (row) => row.id === id && row.companyId === companyId,
    )
    return voucher ? structuredClone(voucher) : null
  }

  async lockById(companyId: string, id: string) {
    return this.findById(companyId, id)
  }

  async save(voucher: PaymentVoucherRecord) {
    const index = this.vouchers.findIndex(
      (row) => row.id === voucher.id && row.companyId === voucher.companyId,
    )
    if (index >= 0) {
      this.vouchers[index] = structuredClone(voucher)
    }
    return voucher
  }

  async listByCompanyId(
    companyId: string,
    options?: PaymentVoucherListOptions,
  ) {
    return this.vouchers
      .filter(
        (row) =>
          row.companyId === companyId &&
          (!options?.kind || row.kind === options.kind) &&
          (!options?.partyId || row.partyId === options.partyId) &&
          (!options?.startDate || row.voucherDate >= options.startDate) &&
          (!options?.endDate || row.voucherDate <= options.endDate),
      )
      .sort(byNewestFirst)
      .map((row) => structuredClone(row))
  }
}

type VoucherRow = typeof schema.paymentVouchers.$inferSelect
type AllocationRow = typeof schema.paymentAllocations.$inferSelect

function mapAllocation(row: AllocationRow): PaymentVoucherAllocationRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    voucherId: row.voucherId,
    documentType: row.documentType as PaymentDocumentType,
    documentId: row.documentId,
    documentNumber: row.documentNumber,
    amount: row.amount,
    createdAt: row.createdAt,
  }
}

function mapVoucher(
  row: VoucherRow,
  allocations: Array<AllocationRow>,
): PaymentVoucherRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    voucherNumber: row.voucherNumber,
    kind: row.kind as PaymentVoucherKind,
    partyId: row.partyId,
    voucherDate: row.voucherDate,
    mode: row.mode as PaymentVoucherMode,
    cashBankAccountId: row.cashBankAccountId,
    partyAccountId: row.partyAccountId,
    reference: row.reference,
    amount: row.amount,
    unallocatedAmount: row.unallocatedAmount,
    narration: row.narration,
    status: row.status as PaymentVoucherStatus,
    ledgerEntryId: row.ledgerEntryId,
    cancelLedgerEntryId: row.cancelLedgerEntryId,
    createdAt: row.createdAt,
    allocations: allocations
      .filter((allocation) => allocation.voucherId === row.id)
      .map(mapAllocation),
  }
}

function allocationValues(allocation: PaymentVoucherAllocationRecord) {
  return {
    id: allocation.id,
    companyId: allocation.companyId,
    voucherId: allocation.voucherId,
    documentType: allocation.documentType,
    documentId: allocation.documentId,
    documentNumber: allocation.documentNumber,
    amount: allocation.amount,
    createdAt: allocation.createdAt,
  }
}

export class DrizzlePaymentVoucherRepository implements PaymentVoucherRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(voucher: PaymentVoucherRecord) {
    await this.database.insert(schema.paymentVouchers).values({
      id: voucher.id,
      companyId: voucher.companyId,
      voucherNumber: voucher.voucherNumber,
      kind: voucher.kind,
      partyId: voucher.partyId,
      voucherDate: voucher.voucherDate,
      mode: voucher.mode,
      cashBankAccountId: voucher.cashBankAccountId,
      partyAccountId: voucher.partyAccountId,
      reference: voucher.reference,
      amount: voucher.amount,
      unallocatedAmount: voucher.unallocatedAmount,
      narration: voucher.narration,
      status: voucher.status,
      ledgerEntryId: voucher.ledgerEntryId,
      cancelLedgerEntryId: voucher.cancelLedgerEntryId,
      createdAt: voucher.createdAt,
    })
    if (voucher.allocations.length > 0) {
      await this.database
        .insert(schema.paymentAllocations)
        .values(voucher.allocations.map(allocationValues))
    }
    return voucher
  }

  async findById(companyId: string, id: string) {
    return this.load(companyId, id, false)
  }

  async lockById(companyId: string, id: string) {
    return this.load(companyId, id, true)
  }

  private async load(companyId: string, id: string, lock: boolean) {
    const query = this.database
      .select()
      .from(schema.paymentVouchers)
      .where(
        and(
          eq(schema.paymentVouchers.companyId, companyId),
          eq(schema.paymentVouchers.id, id),
        ),
      )
      .limit(1)
    const rows = await (lock ? query.for('update') : query)
    if (rows.length === 0) return null
    const row = rows[0]
    const allocations = await this.database
      .select()
      .from(schema.paymentAllocations)
      .where(
        and(
          eq(schema.paymentAllocations.companyId, companyId),
          eq(schema.paymentAllocations.voucherId, id),
        ),
      )
    return mapVoucher(row, allocations)
  }

  async save(voucher: PaymentVoucherRecord) {
    await this.database
      .update(schema.paymentVouchers)
      .set({
        unallocatedAmount: voucher.unallocatedAmount,
        status: voucher.status,
        cancelLedgerEntryId: voucher.cancelLedgerEntryId,
      })
      .where(
        and(
          eq(schema.paymentVouchers.companyId, voucher.companyId),
          eq(schema.paymentVouchers.id, voucher.id),
        ),
      )

    const stored = await this.database
      .select({ id: schema.paymentAllocations.id })
      .from(schema.paymentAllocations)
      .where(
        and(
          eq(schema.paymentAllocations.companyId, voucher.companyId),
          eq(schema.paymentAllocations.voucherId, voucher.id),
        ),
      )
    const storedIds = new Set(stored.map((row) => row.id))
    const added = voucher.allocations.filter((row) => !storedIds.has(row.id))
    if (added.length > 0) {
      await this.database
        .insert(schema.paymentAllocations)
        .values(added.map(allocationValues))
    }
    return voucher
  }

  async listByCompanyId(
    companyId: string,
    options?: PaymentVoucherListOptions,
  ) {
    const filters = [eq(schema.paymentVouchers.companyId, companyId)]
    if (options?.kind) {
      filters.push(eq(schema.paymentVouchers.kind, options.kind))
    }
    if (options?.partyId) {
      filters.push(eq(schema.paymentVouchers.partyId, options.partyId))
    }
    if (options?.startDate) {
      filters.push(gte(schema.paymentVouchers.voucherDate, options.startDate))
    }
    if (options?.endDate) {
      filters.push(lte(schema.paymentVouchers.voucherDate, options.endDate))
    }
    const rows = await this.database
      .select()
      .from(schema.paymentVouchers)
      .where(and(...filters))
      .orderBy(
        desc(schema.paymentVouchers.voucherDate),
        desc(schema.paymentVouchers.createdAt),
      )
    if (rows.length === 0) return []
    const allocations = await this.database
      .select()
      .from(schema.paymentAllocations)
      .where(
        and(
          eq(schema.paymentAllocations.companyId, companyId),
          inArray(
            schema.paymentAllocations.voucherId,
            rows.map((row) => row.id),
          ),
        ),
      )
    return rows.map((row) => mapVoucher(row, allocations))
  }
}

export function createPaymentVoucherRepository(): PaymentVoucherRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryPaymentVoucherRepository()
  }
  return new DrizzlePaymentVoucherRepository(database)
}

export const paymentVoucherRepository = createPaymentVoucherRepository()
