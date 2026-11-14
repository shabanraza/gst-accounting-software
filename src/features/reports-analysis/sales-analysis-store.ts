import { and, eq, gte, inArray, isNotNull, lte, ne } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { StockMovementRepository } from '#/features/inventory/stock-movement-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { SalesAnalysisData } from '#/features/reports-analysis/sales-analysis-service.ts'
import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

export type SalesAnalysisPeriod = {
  companyId: string
  from: string
  to: string
}

/** Loads what the sales analysis needs for one company and period. */
export interface SalesAnalysisRepository {
  loadPeriod: (period: SalesAnalysisPeriod) => Promise<SalesAnalysisData>
}

export type SalesAnalysisSourceRepositories = {
  invoices: SalesInvoiceRepository
  stock: StockMovementRepository
  notes: CreditDebitNoteRepository
  items: ItemRepository
  parties: PartyRepository
}

/** Reads through the existing repositories (tests and no-DB dev). */
export class InMemorySalesAnalysisRepository implements SalesAnalysisRepository {
  constructor(private readonly sources: SalesAnalysisSourceRepositories) {}

  async loadPeriod({ companyId, from, to }: SalesAnalysisPeriod) {
    const [invoices, movements, notes, items, parties] = await Promise.all([
      this.sources.invoices.listByCompanyId(companyId, {
        startDate: from,
        endDate: to,
      }),
      this.sources.stock.listByCompanyId(companyId),
      this.sources.notes.listByCompanyId(companyId),
      this.sources.items.listByCompanyId(companyId),
      this.sources.parties.listByCompanyId(companyId),
    ])
    const partyNames = new Map(parties.map((party) => [party.id, party.name]))
    const inPeriod = (date: string) => date >= from && date <= to

    return {
      from,
      to,
      invoices: invoices
        .filter((invoice) => invoice.status !== 'cancelled')
        .map((invoice) => ({
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          customerId: invoice.customerId,
          customerName:
            partyNames.get(invoice.customerId) ?? invoice.partyNameSnapshot,
          status: invoice.status,
          totalAmount: invoice.totalAmount,
          outstandingAmount: invoice.outstandingAmount,
          lines: invoice.lines.map((line) => ({
            itemId: line.itemId,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            taxableAmount: line.taxableAmount,
            gstAmount: line.gstAmount,
          })),
        })),
      saleMovements: movements
        .filter(
          (movement) =>
            movement.movementType === 'sale_out' &&
            movement.referenceType === 'sales_invoice' &&
            inPeriod(movement.occurredOn),
        )
        .map((movement) => ({
          referenceId: movement.referenceId,
          itemId: movement.itemId,
          quantity: movement.quantity,
          value: movement.value,
        })),
      creditNotes: notes
        .filter(
          (note) =>
            note.noteType === 'credit' &&
            note.referenceDocumentId !== null &&
            inPeriod(note.noteDate),
        )
        .map((note) => ({
          id: note.id,
          noteDate: note.noteDate,
          referenceDocumentId: note.referenceDocumentId,
          taxableAmount: note.taxableAmount,
          totalGstAmount: note.totalGstAmount,
          totalAmount: note.totalAmount,
          createdAt: note.createdAt,
        })),
      returnMovements: movements
        .filter(
          (movement) =>
            movement.movementType === 'sales_return_in' &&
            movement.referenceType === 'sales_return' &&
            inPeriod(movement.occurredOn),
        )
        .map((movement) => ({
          referenceId: movement.referenceId,
          itemId: movement.itemId,
          quantity: movement.quantity,
          value: movement.value,
          occurredOn: movement.occurredOn,
          createdAt: movement.createdAt,
        })),
      items: items.map((item) => ({ id: item.id, name: item.name })),
    }
  }
}

/** Period-filtered queries, every one scoped to the company. */
export class DrizzleSalesAnalysisRepository implements SalesAnalysisRepository {
  constructor(private readonly database: AppDatabase) {}

  async loadPeriod({ companyId, from, to }: SalesAnalysisPeriod) {
    const invoiceScope = and(
      eq(schema.salesInvoices.companyId, companyId),
      gte(schema.salesInvoices.invoiceDate, from),
      lte(schema.salesInvoices.invoiceDate, to),
      ne(schema.salesInvoices.status, 'cancelled'),
    )
    const movementScope = (movementType: string, referenceType: string) =>
      and(
        eq(schema.stockMovements.companyId, companyId),
        eq(schema.stockMovements.movementType, movementType),
        eq(schema.stockMovements.referenceType, referenceType),
        gte(schema.stockMovements.occurredOn, from),
        lte(schema.stockMovements.occurredOn, to),
      )
    const movementColumns = {
      referenceId: schema.stockMovements.referenceId,
      itemId: schema.stockMovements.itemId,
      quantity: schema.stockMovements.quantity,
      value: schema.stockMovements.value,
      occurredOn: schema.stockMovements.occurredOn,
      createdAt: schema.stockMovements.createdAt,
    }

    const [invoices, lines, saleMovements, returnMovements, notes] =
      await Promise.all([
        this.database
          .select({
            id: schema.salesInvoices.id,
            invoiceNumber: schema.salesInvoices.invoiceNumber,
            invoiceDate: schema.salesInvoices.invoiceDate,
            customerId: schema.salesInvoices.customerId,
            partyNameSnapshot: schema.salesInvoices.partyNameSnapshot,
            partyName: schema.parties.name,
            status: schema.salesInvoices.status,
            totalAmount: schema.salesInvoices.totalAmount,
            outstandingAmount: schema.salesInvoices.outstandingAmount,
          })
          .from(schema.salesInvoices)
          .leftJoin(
            schema.parties,
            and(
              eq(schema.parties.id, schema.salesInvoices.customerId),
              eq(schema.parties.companyId, companyId),
            ),
          )
          .where(invoiceScope),
        this.database
          .select({
            salesInvoiceId: schema.salesInvoiceLines.salesInvoiceId,
            itemId: schema.salesInvoiceLines.itemId,
            description: schema.salesInvoiceLines.description,
            quantity: schema.salesInvoiceLines.quantity,
            unit: schema.salesInvoiceLines.unit,
            taxableAmount: schema.salesInvoiceLines.taxableAmount,
            gstAmount: schema.salesInvoiceLines.gstAmount,
          })
          .from(schema.salesInvoiceLines)
          .innerJoin(
            schema.salesInvoices,
            eq(
              schema.salesInvoices.id,
              schema.salesInvoiceLines.salesInvoiceId,
            ),
          )
          .where(invoiceScope),
        this.database
          .select(movementColumns)
          .from(schema.stockMovements)
          .where(movementScope('sale_out', 'sales_invoice')),
        this.database
          .select(movementColumns)
          .from(schema.stockMovements)
          .where(movementScope('sales_return_in', 'sales_return')),
        this.database
          .select({
            id: schema.creditDebitNotes.id,
            noteDate: schema.creditDebitNotes.noteDate,
            referenceDocumentId: schema.creditDebitNotes.referenceDocumentId,
            taxableAmount: schema.creditDebitNotes.taxableAmount,
            totalGstAmount: schema.creditDebitNotes.totalGstAmount,
            totalAmount: schema.creditDebitNotes.totalAmount,
            createdAt: schema.creditDebitNotes.createdAt,
          })
          .from(schema.creditDebitNotes)
          .where(
            and(
              eq(schema.creditDebitNotes.companyId, companyId),
              eq(schema.creditDebitNotes.noteType, 'credit'),
              isNotNull(schema.creditDebitNotes.referenceDocumentId),
              gte(schema.creditDebitNotes.noteDate, from),
              lte(schema.creditDebitNotes.noteDate, to),
            ),
          ),
      ])

    const itemIds = [...new Set(lines.map((line) => line.itemId))]
    const items =
      itemIds.length === 0
        ? []
        : await this.database
            .select({ id: schema.items.id, name: schema.items.name })
            .from(schema.items)
            .where(
              and(
                eq(schema.items.companyId, companyId),
                inArray(schema.items.id, itemIds),
              ),
            )

    const linesByInvoice = new Map<string, typeof lines>()
    for (const line of lines) {
      const list = linesByInvoice.get(line.salesInvoiceId) ?? []
      list.push(line)
      linesByInvoice.set(line.salesInvoiceId, list)
    }

    return {
      from,
      to,
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerId: invoice.customerId,
        customerName: invoice.partyName ?? invoice.partyNameSnapshot,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        outstandingAmount: invoice.outstandingAmount,
        lines: (linesByInvoice.get(invoice.id) ?? []).map((line) => ({
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          taxableAmount: line.taxableAmount,
          gstAmount: line.gstAmount,
        })),
      })),
      // Legacy movements carry no value; they cost nothing here.
      saleMovements: saleMovements.map((movement) => ({
        referenceId: movement.referenceId,
        itemId: movement.itemId,
        quantity: movement.quantity,
        value: movement.value ?? '0.00',
      })),
      returnMovements: returnMovements.map((movement) => ({
        ...movement,
        value: movement.value ?? '0.00',
      })),
      creditNotes: notes,
      items,
    }
  }
}

export function createSalesAnalysisRepository(
  sources: SalesAnalysisSourceRepositories,
): SalesAnalysisRepository {
  const database = getDb()
  if (!database) {
    return new InMemorySalesAnalysisRepository(sources)
  }
  return new DrizzleSalesAnalysisRepository(database)
}
