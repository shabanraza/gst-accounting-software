import { beforeEach, describe, expect, test } from 'vitest'

import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import {
  InvalidExpenseError,
  postExpense,
} from '#/features/expenses/expense-service.ts'
import { InMemoryExpenseRepository } from '#/features/expenses/expense-store.ts'

import type { PostExpenseInput } from '#/features/expenses/expense-service.ts'

let expenses: InMemoryExpenseRepository
let posting: InMemoryLedgerPostingRepository
const companyId = crypto.randomUUID()
const expenseAccountId = crypto.randomUUID()
const cashAccountId = crypto.randomUUID()
const inputGstAccountId = crypto.randomUUID()

function input(overrides: Partial<PostExpenseInput> = {}): PostExpenseInput {
  return {
    companyId,
    expenseDate: '2026-07-12',
    narration: 'Office rent',
    amount: '15000.00',
    expenseAccountId,
    paymentAccountId: cashAccountId,
    ...overrides,
  }
}

async function linesFor(ledgerEntryId: string) {
  const entries = await posting.listByCompanyId(companyId)
  const entry = entries.find((row) => row.id === ledgerEntryId)!
  return entry.lines.map((line) => [
    line.ledgerAccountId,
    line.debit,
    line.credit,
  ])
}

beforeEach(() => {
  expenses = new InMemoryExpenseRepository()
  posting = new InMemoryLedgerPostingRepository()
})

describe('postExpense', () => {
  test('posts an expense without GST as before', async () => {
    const expense = await postExpense(expenses, posting, input())

    expect(expense).toMatchObject({
      amount: '15000.00',
      taxableAmount: '15000.00',
      gstRate: '0.00',
      gstAmount: '0.00',
      itcClaimed: false,
    })
    expect(await linesFor(expense.ledgerEntryId)).toEqual([
      [expenseAccountId, '15000.00', '0.00'],
      [cashAccountId, '0.00', '15000.00'],
    ])
    expect(await expenses.listByCompanyId(companyId)).toHaveLength(1)
  })

  test('puts claimable GST in Input GST and pays the total', async () => {
    const expense = await postExpense(
      expenses,
      posting,
      input({
        amount: '10000.00',
        gstRate: '18',
        supplierName: 'Shree Properties',
        supplierGstin: '27aabcs1234k1z5',
        billNumber: 'SP/26/041',
        claimItc: true,
        inputGstAccountId,
      }),
    )

    expect(expense).toMatchObject({
      amount: '11800.00',
      taxableAmount: '10000.00',
      gstRate: '18.00',
      gstAmount: '1800.00',
      itcClaimed: true,
      supplierGstin: '27AABCS1234K1Z5',
      billNumber: 'SP/26/041',
      placeOfSupply: '27',
    })
    expect(await linesFor(expense.ledgerEntryId)).toEqual([
      [expenseAccountId, '10000.00', '0.00'],
      [inputGstAccountId, '1800.00', '0.00'],
      [cashAccountId, '0.00', '11800.00'],
    ])
  })

  test('adds GST to the expense when credit is not claimed', async () => {
    const expense = await postExpense(
      expenses,
      posting,
      input({
        narration: 'Staff lunch',
        amount: '1000.00',
        gstRate: '5',
        supplierName: 'Cafe',
        claimItc: false,
      }),
    )

    expect(expense).toMatchObject({
      amount: '1050.00',
      gstAmount: '50.00',
      itcClaimed: false,
    })
    expect(await linesFor(expense.ledgerEntryId)).toEqual([
      [expenseAccountId, '1050.00', '0.00'],
      [cashAccountId, '0.00', '1050.00'],
    ])
  })

  test('rounds GST to the paisa', async () => {
    const expense = await postExpense(
      expenses,
      posting,
      input({
        amount: '333.33',
        gstRate: '18',
        supplierGstin: '27AABCS1234K1Z5',
        billNumber: 'B-1',
        claimItc: true,
        inputGstAccountId,
      }),
    )

    expect(expense.gstAmount).toBe('60.00')
    expect(expense.amount).toBe('393.33')
  })

  test('requires the supplier GSTIN and bill number to claim credit', async () => {
    await expect(
      postExpense(
        expenses,
        posting,
        input({
          gstRate: '18',
          billNumber: 'B-1',
          claimItc: true,
          inputGstAccountId,
        }),
      ),
    ).rejects.toThrow('Enter the supplier GSTIN to claim input tax credit')
    await expect(
      postExpense(
        expenses,
        posting,
        input({
          gstRate: '18',
          supplierGstin: '27AABCS1234K1Z5',
          claimItc: true,
          inputGstAccountId,
        }),
      ),
    ).rejects.toThrow('Enter the bill number to claim input tax credit')
    await expect(
      postExpense(
        expenses,
        posting,
        input({
          gstRate: '18',
          supplierGstin: '27AABCS1234',
          billNumber: 'B-1',
          claimItc: true,
          inputGstAccountId,
        }),
      ),
    ).rejects.toThrow('Supplier GSTIN is not valid')
    expect(await posting.listByCompanyId(companyId)).toEqual([])
  })

  test('rejects a bad amount or GST rate', async () => {
    await expect(
      postExpense(expenses, posting, input({ amount: '0' })),
    ).rejects.toBeInstanceOf(InvalidExpenseError)
    await expect(
      postExpense(expenses, posting, input({ gstRate: '120' })),
    ).rejects.toThrow('GST rate must be between 0 and 100')
  })
})
