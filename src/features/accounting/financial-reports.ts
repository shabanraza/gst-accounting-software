import Decimal from 'decimal.js'

import { listLedgerAccountsByCompany } from '#/features/accounting/chart-of-accounts.ts'

import type {
  LedgerAccountRepository,
  LedgerAccountType,
} from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'

export type TrialBalanceRow = {
  accountId: string
  code: string
  name: string
  accountType: LedgerAccountType
  totalDebit: string
  totalCredit: string
  balance: string
  balanceType: 'debit' | 'credit'
}

export type TrialBalanceReport = {
  companyId: string
  rows: Array<TrialBalanceRow>
  totalDebit: string
  totalCredit: string
}

function money(value: string): Decimal {
  return new Decimal(value)
}

async function sumLinesByAccount(
  postings: LedgerPostingRepository,
  companyId: string,
): Promise<Map<string, { debit: Decimal; credit: Decimal }>> {
  const entries = await postings.listByCompanyId(companyId)
  const totalsByAccountId = new Map<string, { debit: Decimal; credit: Decimal }>()

  for (const entry of entries) {
    for (const line of entry.lines) {
      const existing = totalsByAccountId.get(line.ledgerAccountId) ?? {
        debit: new Decimal(0),
        credit: new Decimal(0),
      }
      existing.debit = existing.debit.plus(money(line.debit))
      existing.credit = existing.credit.plus(money(line.credit))
      totalsByAccountId.set(line.ledgerAccountId, existing)
    }
  }

  return totalsByAccountId
}

export async function buildTrialBalance(
  deps: {
    ledgers: LedgerAccountRepository
    postings: LedgerPostingRepository
  },
  companyId: string,
): Promise<TrialBalanceReport> {
  const [accounts, totalsByAccountId] = await Promise.all([
    listLedgerAccountsByCompany(deps.ledgers, companyId),
    sumLinesByAccount(deps.postings, companyId),
  ])

  let totalDebit = new Decimal(0)
  let totalCredit = new Decimal(0)

  const rows: Array<TrialBalanceRow> = accounts.map((account) => {
    const totals = totalsByAccountId.get(account.id) ?? {
      debit: new Decimal(0),
      credit: new Decimal(0),
    }
    totalDebit = totalDebit.plus(totals.debit)
    totalCredit = totalCredit.plus(totals.credit)

    const net = totals.debit.minus(totals.credit)
    const balanceType: 'debit' | 'credit' = net.isNegative() ? 'credit' : 'debit'

    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      accountType: account.accountType,
      totalDebit: totals.debit.toFixed(2),
      totalCredit: totals.credit.toFixed(2),
      balance: net.abs().toFixed(2),
      balanceType,
    }
  })

  return {
    companyId,
    rows,
    totalDebit: totalDebit.toFixed(2),
    totalCredit: totalCredit.toFixed(2),
  }
}

export type ProfitAndLossReport = {
  companyId: string
  incomeRows: Array<{ accountId: string; name: string; amount: string }>
  expenseRows: Array<{ accountId: string; name: string; amount: string }>
  totalIncome: string
  totalExpense: string
  netProfit: string
}

export async function buildProfitAndLoss(
  deps: {
    ledgers: LedgerAccountRepository
    postings: LedgerPostingRepository
  },
  companyId: string,
): Promise<ProfitAndLossReport> {
  const trialBalance = await buildTrialBalance(deps, companyId)

  const incomeRows = trialBalance.rows
    .filter((row) => row.accountType === 'income')
    .map((row) => ({
      accountId: row.accountId,
      name: row.name,
      amount: row.balanceType === 'credit' ? row.balance : `-${row.balance}`,
    }))

  const expenseRows = trialBalance.rows
    .filter((row) => row.accountType === 'expense')
    .map((row) => ({
      accountId: row.accountId,
      name: row.name,
      amount: row.balanceType === 'debit' ? row.balance : `-${row.balance}`,
    }))

  const totalIncome = incomeRows.reduce(
    (sum, row) => sum.plus(money(row.amount)),
    new Decimal(0),
  )
  const totalExpense = expenseRows.reduce(
    (sum, row) => sum.plus(money(row.amount)),
    new Decimal(0),
  )

  return {
    companyId,
    incomeRows,
    expenseRows,
    totalIncome: totalIncome.toFixed(2),
    totalExpense: totalExpense.toFixed(2),
    netProfit: totalIncome.minus(totalExpense).toFixed(2),
  }
}

export type BalanceSheetReport = {
  companyId: string
  assetRows: Array<{ accountId: string; name: string; amount: string }>
  liabilityRows: Array<{ accountId: string; name: string; amount: string }>
  equityRows: Array<{ accountId: string; name: string; amount: string }>
  totalAssets: string
  totalLiabilities: string
  totalEquity: string
  netProfit: string
}

export async function buildBalanceSheet(
  deps: {
    ledgers: LedgerAccountRepository
    postings: LedgerPostingRepository
  },
  companyId: string,
): Promise<BalanceSheetReport> {
  const [trialBalance, profitAndLoss] = await Promise.all([
    buildTrialBalance(deps, companyId),
    buildProfitAndLoss(deps, companyId),
  ])

  const assetRows = trialBalance.rows
    .filter((row) => row.accountType === 'asset')
    .map((row) => ({
      accountId: row.accountId,
      name: row.name,
      amount: row.balanceType === 'debit' ? row.balance : `-${row.balance}`,
    }))

  const liabilityRows = trialBalance.rows
    .filter((row) => row.accountType === 'liability')
    .map((row) => ({
      accountId: row.accountId,
      name: row.name,
      amount: row.balanceType === 'credit' ? row.balance : `-${row.balance}`,
    }))

  const equityRows = trialBalance.rows
    .filter((row) => row.accountType === 'equity')
    .map((row) => ({
      accountId: row.accountId,
      name: row.name,
      amount: row.balanceType === 'credit' ? row.balance : `-${row.balance}`,
    }))

  const totalAssets = assetRows.reduce(
    (sum, row) => sum.plus(money(row.amount)),
    new Decimal(0),
  )
  const totalLiabilities = liabilityRows.reduce(
    (sum, row) => sum.plus(money(row.amount)),
    new Decimal(0),
  )
  const totalEquity = equityRows.reduce(
    (sum, row) => sum.plus(money(row.amount)),
    new Decimal(0),
  )

  return {
    companyId,
    assetRows,
    liabilityRows,
    equityRows,
    totalAssets: totalAssets.toFixed(2),
    totalLiabilities: totalLiabilities.toFixed(2),
    totalEquity: totalEquity.toFixed(2),
    netProfit: profitAndLoss.netProfit,
  }
}
