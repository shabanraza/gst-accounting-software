import Decimal from 'decimal.js'

import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'

export type Gstr2bRow = {
  supplierGstin: string
  supplierInvoiceNumber: string
  invoiceDate: string
  taxableAmount: string
  totalGstAmount: string
}

export type Gstr2bMatchStatus = 'matched' | 'mismatched' | 'missing_in_books' | 'missing_in_2b'

export type Gstr2bReconciliationRow = {
  supplierInvoiceNumber: string
  supplierGstin: string | null
  bookTaxableAmount: string | null
  bookTotalGstAmount: string | null
  portalTaxableAmount: string | null
  portalTotalGstAmount: string | null
  status: Gstr2bMatchStatus
}

export type Gstr2bReconciliationReport = {
  companyId: string
  rows: Array<Gstr2bReconciliationRow>
}

function amountsMatch(left: string, right: string): boolean {
  return new Decimal(left).minus(new Decimal(right)).abs().lte('0.01')
}

export async function reconcileGstr2b(
  deps: { bills: PurchaseBillRepository },
  companyId: string,
  portalRows: Array<Gstr2bRow>,
): Promise<Gstr2bReconciliationReport> {
  const bills = await deps.bills.listByCompanyId(companyId)
  const rows: Array<Gstr2bReconciliationRow> = []
  const matchedPortalInvoiceNumbers = new Set<string>()

  for (const bill of bills) {
    const portalRow = portalRows.find(
      (row) => row.supplierInvoiceNumber === bill.supplierBillNumber,
    )

    if (!portalRow) {
      rows.push({
        supplierInvoiceNumber: bill.supplierBillNumber,
        supplierGstin: null,
        bookTaxableAmount: bill.taxableAmount,
        bookTotalGstAmount: bill.totalGstAmount,
        portalTaxableAmount: null,
        portalTotalGstAmount: null,
        status: 'missing_in_2b',
      })
      continue
    }

    matchedPortalInvoiceNumbers.add(portalRow.supplierInvoiceNumber)

    const status: Gstr2bMatchStatus =
      amountsMatch(bill.taxableAmount, portalRow.taxableAmount) &&
      amountsMatch(bill.totalGstAmount, portalRow.totalGstAmount)
        ? 'matched'
        : 'mismatched'

    rows.push({
      supplierInvoiceNumber: bill.supplierBillNumber,
      supplierGstin: portalRow.supplierGstin,
      bookTaxableAmount: bill.taxableAmount,
      bookTotalGstAmount: bill.totalGstAmount,
      portalTaxableAmount: portalRow.taxableAmount,
      portalTotalGstAmount: portalRow.totalGstAmount,
      status,
    })
  }

  for (const portalRow of portalRows) {
    if (matchedPortalInvoiceNumbers.has(portalRow.supplierInvoiceNumber)) continue

    rows.push({
      supplierInvoiceNumber: portalRow.supplierInvoiceNumber,
      supplierGstin: portalRow.supplierGstin,
      bookTaxableAmount: null,
      bookTotalGstAmount: null,
      portalTaxableAmount: portalRow.taxableAmount,
      portalTotalGstAmount: portalRow.totalGstAmount,
      status: 'missing_in_books',
    })
  }

  return { companyId, rows }
}
