import Decimal from 'decimal.js'

import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'
import type { GstReportDocument } from '#/features/gst/gst-report-types.ts'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function taxSplit(
  companyStateCode: string,
  placeOfSupply: string,
  totalGstAmount: string,
) {
  const supplyType: GstReportDocument['supplyType'] =
    placeOfSupply === companyStateCode ? 'intra_state' : 'inter_state'
  const half = new Decimal(totalGstAmount).div(2).toFixed(2)
  return {
    placeOfSupply,
    supplyType,
    cgstAmount: supplyType === 'intra_state' ? half : '0.00',
    sgstAmount: supplyType === 'intra_state' ? half : '0.00',
    igstAmount: supplyType === 'inter_state' ? totalGstAmount : '0.00',
  }
}

export async function buildGstDocuments(input: {
  companyId: string
  companyStateCode: string
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  parties: PartyRepository
  notes: CreditDebitNoteRepository
}): Promise<Array<GstReportDocument>> {
  const [sales, purchases, partyList, notes] = await Promise.all([
    input.invoices.listByCompanyId(input.companyId),
    input.bills.listByCompanyId(input.companyId),
    input.parties.listByCompanyId(input.companyId),
    input.notes.listByCompanyId(input.companyId),
  ])
  const partyById = new Map(partyList.map((party) => [party.id, party]))
  const invoiceById = new Map(sales.map((invoice) => [invoice.id, invoice]))
  const billById = new Map(purchases.map((bill) => [bill.id, bill]))

  const activeSales = sales.filter((invoice) => invoice.status !== 'cancelled')

  const salesDocs: Array<GstReportDocument> = activeSales.map((invoice) => {
    const party = partyById.get(invoice.customerId)
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      documentType: 'sales_invoice',
      documentDate: invoice.invoiceDate,
      partyGstin: party?.gstin ?? null,
      partyName: party?.name ?? 'Customer',
      ...taxSplit(
        input.companyStateCode,
        invoice.placeOfSupply ||
          (party?.stateCode ?? input.companyStateCode),
        invoice.totalGstAmount,
      ),
      taxableAmount: invoice.taxableAmount,
      totalGstAmount: invoice.totalGstAmount,
      totalAmount: invoice.totalAmount,
      invoiceNumber: invoice.invoiceNumber,
      reverseCharge: invoice.reverseCharge,
      rateLines: invoice.lines.map((line) => ({
        gstRate: line.gstRate,
        taxableAmount: line.taxableAmount,
        gstAmount: line.gstAmount,
      })),
    }
  })

  const purchaseDocs: Array<GstReportDocument> = purchases.map((bill) => {
    const party = partyById.get(bill.supplierId)
    return {
      id: bill.id,
      companyId: bill.companyId,
      documentType: 'purchase_bill',
      documentDate: bill.billDate,
      partyGstin: party?.gstin ?? null,
      partyName: party?.name ?? 'Supplier',
      ...taxSplit(
        input.companyStateCode,
        party?.stateCode ?? input.companyStateCode,
        bill.totalGstAmount,
      ),
      taxableAmount: bill.taxableAmount,
      totalGstAmount: bill.totalGstAmount,
      totalAmount: bill.totalAmount,
      invoiceNumber: bill.supplierBillNumber,
    }
  })

  // Credit notes come from sales returns and debit notes from purchase returns;
  // each takes its place of supply from the invoice or bill it was issued against.
  const noteDocs: Array<GstReportDocument> = notes.map((note) => {
    const party = partyById.get(note.partyId)
    const partyState = party?.stateCode ?? input.companyStateCode
    const invoice =
      note.noteType === 'credit' && note.referenceDocumentId
        ? invoiceById.get(note.referenceDocumentId)
        : undefined
    const bill =
      note.noteType === 'debit' && note.referenceDocumentId
        ? billById.get(note.referenceDocumentId)
        : undefined
    const invoiceRates = new Set(invoice?.lines.map((line) => line.gstRate))
    const originalInvoice = invoice
      ? {
          invoiceNumber: invoice.invoiceNumber,
          documentDate: invoice.invoiceDate,
          totalAmount: invoice.totalAmount,
        }
      : bill
        ? {
            invoiceNumber: bill.supplierBillNumber,
            documentDate: bill.billDate,
            totalAmount: bill.totalAmount,
          }
        : undefined
    return {
      id: note.id,
      companyId: note.companyId,
      documentType: note.noteType === 'credit' ? 'credit_note' : 'debit_note',
      documentDate: note.noteDate,
      partyGstin: party?.gstin ?? null,
      partyName: party?.name ?? (bill ? 'Supplier' : 'Customer'),
      ...taxSplit(
        input.companyStateCode,
        invoice?.placeOfSupply || partyState,
        note.totalGstAmount,
      ),
      taxableAmount: note.taxableAmount,
      totalGstAmount: note.totalGstAmount,
      totalAmount: note.totalAmount,
      invoiceNumber: note.noteNumber,
      reverseCharge: invoice?.reverseCharge,
      originalInvoice,
      // Notes keep totals only; a return against a one-rate invoice is at that rate.
      rateLines:
        invoiceRates.size === 1
          ? [
              {
                gstRate: [...invoiceRates][0]!,
                taxableAmount: note.taxableAmount,
                gstAmount: note.totalGstAmount,
              },
            ]
          : undefined,
    }
  })

  return [...salesDocs, ...purchaseDocs, ...noteDocs]
}
