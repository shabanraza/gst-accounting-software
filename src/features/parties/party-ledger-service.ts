import Decimal from 'decimal.js'

import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

export type PartyLedgerEntry = {
  documentType: 'sales_invoice' | 'purchase_bill' | 'credit_note' | 'debit_note'
  documentId: string
  documentNumber: string
  date: string
  debit: string
  credit: string
}

export type PartyLedgerReport = {
  partyId: string
  entries: Array<PartyLedgerEntry>
  totalDebit: string
  totalCredit: string
  closingBalance: string
}

export type PartyLedgerDependencies = {
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  notes: CreditDebitNoteRepository
}

export async function buildPartyLedger(
  deps: PartyLedgerDependencies,
  companyId: string,
  partyId: string,
): Promise<PartyLedgerReport> {
  const [invoices, bills, notes] = await Promise.all([
    deps.invoices.listByCompanyId(companyId),
    deps.bills.listByCompanyId(companyId),
    deps.notes.listByCompanyId(companyId),
  ])

  const entries: Array<PartyLedgerEntry> = []

  for (const invoice of invoices) {
    if (invoice.customerId !== partyId) continue
    entries.push({
      documentType: 'sales_invoice',
      documentId: invoice.id,
      documentNumber: invoice.invoiceNumber,
      date: invoice.invoiceDate,
      debit: invoice.totalAmount,
      credit: '0.00',
    })
  }

  for (const bill of bills) {
    if (bill.supplierId !== partyId) continue
    entries.push({
      documentType: 'purchase_bill',
      documentId: bill.id,
      documentNumber: bill.supplierBillNumber,
      date: bill.billDate,
      debit: '0.00',
      credit: bill.totalAmount,
    })
  }

  for (const note of notes) {
    if (note.partyId !== partyId) continue
    if (note.noteType === 'credit') {
      entries.push({
        documentType: 'credit_note',
        documentId: note.id,
        documentNumber: note.noteNumber,
        date: note.noteDate,
        debit: '0.00',
        credit: note.totalAmount,
      })
    } else {
      entries.push({
        documentType: 'debit_note',
        documentId: note.id,
        documentNumber: note.noteNumber,
        date: note.noteDate,
        debit: note.totalAmount,
        credit: '0.00',
      })
    }
  }

  entries.sort((left, right) => left.date.localeCompare(right.date))

  const totalDebit = entries.reduce(
    (sum, entry) => sum.plus(new Decimal(entry.debit)),
    new Decimal(0),
  )
  const totalCredit = entries.reduce(
    (sum, entry) => sum.plus(new Decimal(entry.credit)),
    new Decimal(0),
  )

  return {
    partyId,
    entries,
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
    closingBalance: totalDebit.minus(totalCredit).toFixed(2),
  }
}
