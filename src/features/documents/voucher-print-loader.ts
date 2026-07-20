import { companyRepository } from '#/features/companies/company-store.ts'
import {
  toPrintCompany,
  toPrintParty,
} from '#/features/documents/voucher-print-mappers.ts'
import { itemRepository } from '#/features/inventory/inventory-store.ts'
import { partyRepository } from '#/features/parties/party-store.ts'
import { purchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { buildPurchaseBillPrintDocument } from '#/features/purchases/purchase-bill-print-service.ts'
import { salesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { buildInvoicePrintDocument } from '#/features/sales/invoice-print-service.ts'

import type { VoucherPrintDocument } from '#/features/documents/voucher-print-types.ts'

async function getCompany(companyId: string) {
  const [company] = await companyRepository.listByIds([companyId])
  return company ?? null
}

async function getItemMap(companyId: string) {
  const items = await itemRepository.listByCompanyId(companyId)
  return new Map(items.map((item) => [item.id, item]))
}

export async function loadSalesInvoicePrintDocument(
  invoiceId: string,
): Promise<VoucherPrintDocument | null> {
  const invoice = await salesInvoiceRepository.findById(invoiceId)
  if (!invoice) return null

  const [company, customer, itemById] = await Promise.all([
    getCompany(invoice.companyId),
    partyRepository.findById(invoice.customerId),
    getItemMap(invoice.companyId),
  ])

  if (!company || !customer || customer.companyId !== invoice.companyId) {
    return null
  }

  return buildInvoicePrintDocument({
    invoice,
    company: toPrintCompany(company),
    customer: toPrintParty(customer),
    itemById,
  })
}

export async function loadPurchaseBillPrintDocument(
  billId: string,
): Promise<VoucherPrintDocument | null> {
  const bill = await purchaseBillRepository.findById(billId)
  if (!bill) return null

  const [company, supplier, itemById] = await Promise.all([
    getCompany(bill.companyId),
    partyRepository.findById(bill.supplierId),
    getItemMap(bill.companyId),
  ])

  if (!company || !supplier || supplier.companyId !== bill.companyId) {
    return null
  }

  return buildPurchaseBillPrintDocument({
    bill,
    company: toPrintCompany(company),
    supplier: toPrintParty(supplier),
    itemById,
  })
}
