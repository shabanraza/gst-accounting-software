import { beforeEach, describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import {
  PartyOpeningBalanceError,
  setPartyOpeningBalance,
} from '#/features/parties/party-opening-balance-service.ts'
import { InMemoryPartyOpeningBalanceRepository } from '#/features/parties/party-opening-balance-store.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'

import type { LedgerAccountRecord } from '#/features/accounting/chart-of-accounts.ts'
import type { PartyOpeningBalanceDependencies } from '#/features/parties/party-opening-balance-service.ts'

let deps: PartyOpeningBalanceDependencies
let companyId: string
let accounts: Array<LedgerAccountRecord>
let customerId: string

const accountOf = (key: string) =>
  accounts.find((account) => account.systemKey === key)!.id

async function balance(accountId: string) {
  const entries = await deps.posting.listByCompanyId(companyId)
  return entries
    .flatMap((entry) => entry.lines)
    .filter((line) => line.ledgerAccountId === accountId)
    .reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0)
}

beforeEach(async () => {
  companyId = crypto.randomUUID()
  const ledgers = new InMemoryLedgerAccountRepository()
  accounts = await setupDefaultChartOfAccounts(ledgers, {
    companyId,
    businessType: 'wholesale',
  })
  const financialYears = new InMemoryFinancialYearRepository()
  for (const [startDate, endDate, isActive] of [
    ['2026-04-01', '2027-03-31', true],
    ['2025-04-01', '2026-03-31', false],
  ] as const) {
    await financialYears.create({
      id: crypto.randomUUID(),
      companyId,
      startDate,
      endDate,
      isActive,
      createdAt: new Date(),
    })
  }
  const parties = new InMemoryPartyRepository()
  deps = {
    parties,
    ledgers,
    posting: new InMemoryLedgerPostingRepository(),
    financialYears,
    openingBalances: new InMemoryPartyOpeningBalanceRepository(),
  }
  const customer = await createParty(parties, {
    companyId,
    name: 'Noor Retailers',
    partyType: 'customer',
    gstin: null,
    stateCode: '27',
    creditLimit: null,
    paymentTermsDays: 30,
    receivableAccountId: accountOf('customer_receivable'),
    payableAccountId: null,
  })
  customerId = customer.id
})

describe('setPartyOpeningBalance', () => {
  test('posts an amount to receive against the Opening Balance ledger on the first year start', async () => {
    const record = await setPartyOpeningBalance(deps, {
      companyId,
      partyId: customerId,
      side: 'receivable',
      amount: '5000',
    })

    expect(record).toMatchObject({
      partyId: customerId,
      side: 'receivable',
      amount: '5000.00',
      outstandingAmount: '5000.00',
      asOfDate: '2025-04-01',
      partyAccountId: accountOf('customer_receivable'),
    })
    const [entry] = await deps.posting.listByCompanyId(companyId)
    expect(entry).toMatchObject({
      entryDate: '2025-04-01',
      voucherType: 'journal',
      narration: 'Opening balance: Noor Retailers',
    })
    expect(await balance(accountOf('customer_receivable'))).toBe(5000)
    expect(await balance(accountOf('opening_balance'))).toBe(-5000)
  })

  test('posts an amount to pay to the supplier payable', async () => {
    await setPartyOpeningBalance(deps, {
      companyId,
      partyId: customerId,
      side: 'payable',
      amount: '1200.50',
    })

    expect(await balance(accountOf('supplier_payable'))).toBe(-1200.5)
    expect(await balance(accountOf('opening_balance'))).toBe(1200.5)
  })

  test('reverses the old entry when the amount changes', async () => {
    await setPartyOpeningBalance(deps, {
      companyId,
      partyId: customerId,
      side: 'receivable',
      amount: '5000',
    })
    const record = await setPartyOpeningBalance(deps, {
      companyId,
      partyId: customerId,
      side: 'receivable',
      amount: '3000',
    })

    expect(record?.amount).toBe('3000.00')
    expect(record?.outstandingAmount).toBe('3000.00')
    expect(await balance(accountOf('customer_receivable'))).toBe(3000)
    expect(await deps.openingBalances.listByCompanyId(companyId)).toHaveLength(
      1,
    )
  })

  test('does not post again when nothing changed', async () => {
    const input = {
      companyId,
      partyId: customerId,
      side: 'receivable' as const,
      amount: '5000.00',
    }
    await setPartyOpeningBalance(deps, input)
    await setPartyOpeningBalance(deps, { ...input, amount: '5000' })

    expect(await deps.posting.listByCompanyId(companyId)).toHaveLength(1)
  })

  test('removes the balance when the amount is zero', async () => {
    await setPartyOpeningBalance(deps, {
      companyId,
      partyId: customerId,
      side: 'receivable',
      amount: '5000',
    })
    const record = await setPartyOpeningBalance(deps, {
      companyId,
      partyId: customerId,
      side: 'receivable',
      amount: '0',
    })

    expect(record).toBeNull()
    expect(await balance(accountOf('customer_receivable'))).toBe(0)
    expect(await deps.openingBalances.listByCompanyId(companyId)).toEqual([])
  })

  test('does nothing for a zero amount when there is no balance', async () => {
    const record = await setPartyOpeningBalance(deps, {
      companyId,
      partyId: customerId,
      side: 'receivable',
      amount: '',
    })

    expect(record).toBeNull()
    expect(await deps.posting.listByCompanyId(companyId)).toEqual([])
  })

  test('refuses to change a balance that receipts are already adjusted against', async () => {
    const record = await setPartyOpeningBalance(deps, {
      companyId,
      partyId: customerId,
      side: 'receivable',
      amount: '5000',
    })
    await deps.openingBalances.save({
      ...record!,
      outstandingAmount: '4000.00',
    })

    await expect(
      setPartyOpeningBalance(deps, {
        companyId,
        partyId: customerId,
        side: 'receivable',
        amount: '6000',
      }),
    ).rejects.toThrow(PartyOpeningBalanceError)
  })

  test('rejects an invalid amount and a party from another company', async () => {
    await expect(
      setPartyOpeningBalance(deps, {
        companyId,
        partyId: customerId,
        side: 'receivable',
        amount: '12.345',
      }),
    ).rejects.toThrow('Opening balance must be a valid amount')
    await expect(
      setPartyOpeningBalance(deps, {
        companyId: crypto.randomUUID(),
        partyId: customerId,
        side: 'receivable',
        amount: '10',
      }),
    ).rejects.toThrow('Party not found')
  })
})
