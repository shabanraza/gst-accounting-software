import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'

export class LedgerAccountNotFoundError extends Error {
  constructor(accountId: string) {
    super(`Ledger account not found for company: ${accountId}`)
    this.name = 'LedgerAccountNotFoundError'
  }
}

export async function assertLedgerAccountsBelongToCompany(
  ledgers: LedgerAccountRepository,
  companyId: string,
  accountIds: Array<string>,
): Promise<void> {
  const accounts = await ledgers.listByCompanyId(companyId)
  const known = new Set(accounts.map((account) => account.id))

  for (const accountId of accountIds) {
    if (!known.has(accountId)) {
      throw new LedgerAccountNotFoundError(accountId)
    }
  }
}
