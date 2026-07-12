import type { BusinessType } from '#/features/companies/company-service.ts'

export type LedgerAccountType =
  'asset' | 'liability' | 'equity' | 'income' | 'expense'

export type LedgerAccountSystemKey =
  | 'sales'
  | 'purchase'
  | 'cash'
  | 'bank'
  | 'customer_receivable'
  | 'supplier_payable'
  | 'input_gst'
  | 'output_gst'
  | 'stock_in_hand'
  | 'expenses'
  | 'cogs'

export type LedgerAccountRecord = {
  id: string
  companyId: string
  code: string
  name: string
  accountType: LedgerAccountType
  systemKey: LedgerAccountSystemKey | null
  isSystem: boolean
  createdAt: Date
}

export type SetupChartOfAccountsInput = {
  companyId: string
  businessType: BusinessType
}

export interface LedgerAccountRepository {
  listByCompanyId: (companyId: string) => Promise<Array<LedgerAccountRecord>>
  createMany: (
    accounts: Array<LedgerAccountRecord>,
  ) => Promise<Array<LedgerAccountRecord>>
}

export class ChartAlreadySetupError extends Error {
  constructor(companyId: string) {
    super(`Chart of accounts already exists for company: ${companyId}`)
    this.name = 'ChartAlreadySetupError'
  }
}

type LedgerTemplate = {
  code: string
  name: string
  accountType: LedgerAccountType
  systemKey: LedgerAccountSystemKey
}

const sharedLedgers: Array<LedgerTemplate> = [
  { code: '1000', name: 'Cash', accountType: 'asset', systemKey: 'cash' },
  { code: '1010', name: 'Bank', accountType: 'asset', systemKey: 'bank' },
  {
    code: '1100',
    name: 'Customer Receivable',
    accountType: 'asset',
    systemKey: 'customer_receivable',
  },
  {
    code: '1200',
    name: 'Input GST',
    accountType: 'asset',
    systemKey: 'input_gst',
  },
  {
    code: '2000',
    name: 'Supplier Payable',
    accountType: 'liability',
    systemKey: 'supplier_payable',
  },
  {
    code: '2100',
    name: 'Output GST',
    accountType: 'liability',
    systemKey: 'output_gst',
  },
  { code: '4000', name: 'Sales', accountType: 'income', systemKey: 'sales' },
  {
    code: '5000',
    name: 'Expenses',
    accountType: 'expense',
    systemKey: 'expenses',
  },
]

const inventoryLedgers: Array<LedgerTemplate> = [
  {
    code: '1300',
    name: 'Stock In Hand',
    accountType: 'asset',
    systemKey: 'stock_in_hand',
  },
  {
    code: '5100',
    name: 'Purchase',
    accountType: 'expense',
    systemKey: 'purchase',
  },
  {
    code: '5200',
    name: 'Cost of Goods Sold',
    accountType: 'expense',
    systemKey: 'cogs',
  },
]

function templatesForBusinessType(
  businessType: BusinessType,
): Array<LedgerTemplate> {
  if (businessType === 'services') {
    return sharedLedgers
  }

  return [...sharedLedgers, ...inventoryLedgers].sort((left, right) =>
    left.code.localeCompare(right.code),
  )
}

export async function setupDefaultChartOfAccounts(
  repository: LedgerAccountRepository,
  input: SetupChartOfAccountsInput,
): Promise<Array<LedgerAccountRecord>> {
  const existingAccounts = await repository.listByCompanyId(input.companyId)

  if (existingAccounts.length > 0) {
    throw new ChartAlreadySetupError(input.companyId)
  }

  const createdAt = new Date()
  const accounts = templatesForBusinessType(input.businessType).map(
    (template) => ({
      id: crypto.randomUUID(),
      companyId: input.companyId,
      code: template.code,
      name: template.name,
      accountType: template.accountType,
      systemKey: template.systemKey,
      isSystem: true,
      createdAt,
    }),
  )

  return repository.createMany(accounts)
}

export async function listLedgerAccountsByCompany(
  repository: LedgerAccountRepository,
  companyId: string,
): Promise<Array<LedgerAccountRecord>> {
  const accounts = await repository.listByCompanyId(companyId)

  return [...accounts].sort((left, right) =>
    left.code.localeCompare(right.code),
  )
}
