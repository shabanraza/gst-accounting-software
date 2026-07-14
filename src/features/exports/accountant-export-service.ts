import { buildTrialBalance } from '#/features/accounting/financial-reports.ts'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

export type AccountantExportPack = {
  exportedAt: string
  companyId: string
  trialBalance: Awaited<ReturnType<typeof buildTrialBalance>>
  salesInvoices: Awaited<ReturnType<SalesInvoiceRepository['listByCompanyId']>>
  purchaseBills: Awaited<ReturnType<PurchaseBillRepository['listByCompanyId']>>
}

export async function buildAccountantExport(
  deps: {
    ledgers: LedgerAccountRepository
    postings: LedgerPostingRepository
    invoices: SalesInvoiceRepository
    bills: PurchaseBillRepository
  },
  companyId: string,
): Promise<AccountantExportPack> {
  const [trialBalance, salesInvoices, purchaseBills] = await Promise.all([
    buildTrialBalance(
      { ledgers: deps.ledgers, postings: deps.postings },
      companyId,
    ),
    deps.invoices.listByCompanyId(companyId, { includeLines: true }),
    deps.bills.listByCompanyId(companyId, { includeLines: true }),
  ])

  return {
    exportedAt: new Date().toISOString(),
    companyId,
    trialBalance,
    salesInvoices,
    purchaseBills,
  }
}
