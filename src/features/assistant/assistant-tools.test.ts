import { describe, expect, test } from 'vitest'

import { createAssistantTools } from '#/features/assistant/assistant-tools.ts'

import type { AssistantToolDeps } from '#/features/assistant/assistant-tools.ts'
import type { LedgerAccountRecord } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerEntryRecord } from '#/features/accounting/posting-engine.ts'
import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { StockBalanceRecord } from '#/features/inventory/stock-movement-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'
import type { PurchaseBillRecord } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'

function byCompany<T extends { companyId: string }>(rows: Array<T>) {
  return async (companyId: string) =>
    rows.filter((row) => row.companyId === companyId)
}

function party(overrides: Partial<PartyRecord>): PartyRecord {
  return {
    id: 'p-1',
    companyId: A,
    name: 'Sharma Traders',
    partyType: 'customer',
    gstin: null,
    stateCode: '27',
    creditLimit: null,
    paymentTermsDays: 0,
    createdAt: new Date(),
    ...overrides,
  } as PartyRecord
}

function invoice(overrides: Partial<SalesInvoiceRecord>): SalesInvoiceRecord {
  return {
    id: 'inv-1',
    companyId: A,
    customerId: 'p-1',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-10-05',
    dueDate: '2026-10-05',
    placeOfSupply: '27',
    reverseCharge: false,
    status: 'posted',
    taxableAmount: '1000.00',
    totalGstAmount: '180.00',
    totalAmount: '1180.00',
    outstandingAmount: '1180.00',
    partyNameSnapshot: 'Sharma Traders',
    lines: [
      {
        itemId: 'item-1',
        description: 'Rice',
        quantity: '10',
        unit: 'kg',
        rate: '100',
        gstRate: '18',
        taxableAmount: '1000.00',
        gstAmount: '180.00',
        lineTotal: '1180.00',
      },
    ],
    ...overrides,
  } as SalesInvoiceRecord
}

function bill(overrides: Partial<PurchaseBillRecord>): PurchaseBillRecord {
  return {
    id: 'bill-1',
    companyId: A,
    supplierId: 'p-2',
    supplierBillNumber: 'B-1',
    billDate: '2026-10-10',
    dueDate: '2026-10-10',
    taxableAmount: '500.00',
    totalGstAmount: '90.00',
    totalAmount: '590.00',
    outstandingAmount: '590.00',
    partyNameSnapshot: 'Gupta Supplies',
    lines: [],
    ...overrides,
  } as unknown as PurchaseBillRecord
}

function ledger(overrides: Partial<LedgerAccountRecord>): LedgerAccountRecord {
  return {
    id: 'l-cash',
    companyId: A,
    code: '1000',
    name: 'Cash',
    accountType: 'asset',
    systemKey: 'cash',
    isSystem: true,
    createdAt: new Date(),
    ...overrides,
  }
}

function entry(
  companyId: string,
  lines: Array<{ ledgerAccountId: string; debit: string; credit: string }>,
): LedgerEntryRecord {
  return {
    id: crypto.randomUUID(),
    companyId,
    entryDate: '2026-10-01',
    narration: '',
    voucherType: 'journal',
    totalDebit: '0',
    totalCredit: '0',
    createdAt: new Date(),
    lines: lines.map((line) => ({
      ...line,
      id: crypto.randomUUID(),
      companyId,
      entryId: 'e',
    })),
  }
}

function buildDeps(): AssistantToolDeps {
  const parties = [
    party({}),
    party({ id: 'p-2', name: 'Gupta Supplies', partyType: 'supplier' }),
    party({ id: 'p-b', companyId: B, name: 'Sharma Traders' }),
  ]
  const invoices = [
    invoice({}),
    invoice({
      id: 'inv-2',
      invoiceNumber: 'INV-2',
      invoiceDate: '2026-10-20',
      outstandingAmount: '0.00',
      lines: [
        {
          itemId: 'item-2',
          description: 'Sugar',
          quantity: '5',
          taxableAmount: '2500.00',
          gstAmount: '0.00',
          lineTotal: '2500.00',
          gstRate: '0',
        } as SalesInvoiceRecord['lines'][number],
      ],
      taxableAmount: '2500.00',
      totalGstAmount: '0.00',
      totalAmount: '2500.00',
    }),
    invoice({ id: 'inv-c', status: 'cancelled', totalAmount: '9999.00' }),
    invoice({ id: 'inv-sep', invoiceDate: '2026-09-30' }),
    invoice({
      id: 'inv-b',
      companyId: B,
      customerId: 'p-b',
      outstandingAmount: '777.00',
      totalAmount: '777.00',
    }),
  ]
  const bills = [bill({})]
  const items = [
    { id: 'item-1', companyId: A, name: 'Rice', baseUnit: 'kg' },
    { id: 'item-2', companyId: A, name: 'Sugar', baseUnit: 'kg' },
    { id: 'item-b', companyId: B, name: 'Rice', baseUnit: 'kg' },
  ] as Array<ItemRecord>
  const balances = [
    { companyId: A, itemId: 'item-1', quantity: '40', value: '4000' },
    { companyId: B, itemId: 'item-b', quantity: '999', value: '1' },
  ] as unknown as Array<StockBalanceRecord>
  const ledgers = [
    ledger({}),
    ledger({ id: 'l-bank', code: '1010', name: 'Bank', systemKey: 'bank' }),
    ledger({ id: 'l-cap', code: '3000', name: 'Capital', systemKey: null }),
    ledger({ id: 'l-cash-b', companyId: B }),
  ]
  const postings = [
    entry(A, [
      { ledgerAccountId: 'l-cash', debit: '1500.00', credit: '0' },
      { ledgerAccountId: 'l-bank', debit: '2500.00', credit: '0' },
      { ledgerAccountId: 'l-cap', debit: '0', credit: '4000.00' },
    ]),
    entry(B, [{ ledgerAccountId: 'l-cash-b', debit: '50000.00', credit: '0' }]),
  ]

  return {
    parties: {
      listByCompanyId: byCompany(parties),
      findById: async (id) => parties.find((row) => row.id === id) ?? null,
      findByCompanyAndName: async () => null,
      create: async (row) => row,
      update: async (row) => row,
    },
    invoices: {
      listByCompanyId: byCompany(invoices),
      create: async (row) => row,
      findById: async () => null,
      save: async (row) => row,
    },
    bills: {
      listByCompanyId: byCompany(bills),
      create: async (row) => row,
      findById: async () => null,
      save: async (row) => row,
      findBySupplierBillNumber: async () => null,
    },
    notes: {
      listByCompanyId: async () => [],
    } as unknown as AssistantToolDeps['notes'],
    items: {
      listByCompanyId: byCompany(items),
      create: async (row) => row,
      update: async (row) => row,
      findById: async () => null,
    },
    stockBalances: {
      listBalancesByCompany: byCompany(balances),
    } as unknown as AssistantToolDeps['stockBalances'],
    ledgers: {
      listByCompanyId: byCompany(ledgers),
    } as unknown as AssistantToolDeps['ledgers'],
    postings: {
      listByCompanyId: byCompany(postings),
      createEntry: async (row) => row,
    },
  }
}

const context = { companyId: A, companyStateCode: '27' }

describe('assistant tools', () => {
  test('exposes only the read-only tool set', () => {
    const tools = createAssistantTools(buildDeps())
    expect(tools.definitions.map((tool) => tool.name).sort()).toEqual([
      'ageing',
      'cash_bank_balances',
      'gstr3b_summary',
      'party_balance',
      'sales_purchase_summary',
      'stock_on_hand',
    ])
  })

  test('party_balance sums open invoices for the active company only', async () => {
    const tools = createAssistantTools(buildDeps())
    const result = await tools.run(
      'party_balance',
      { partyName: 'sharma' },
      context,
    )
    expect(result.data).toEqual({
      parties: [
        {
          name: 'Sharma Traders',
          receivable: '2360.00',
          payable: '0.00',
          openDocuments: 2,
        },
      ],
    })
    expect(result.link).toEqual({
      label: 'Parties',
      href: '/app/masters/parties',
    })
  })

  test('ageing returns bucket totals with the ageing report link', async () => {
    const tools = createAssistantTools(buildDeps())
    const result = await tools.run('ageing', { kind: 'payables' }, context)
    const data = result.data as { total: string; topParties: Array<unknown> }
    expect(data.total).toBe('590.00')
    expect(data.topParties).toEqual([
      { name: 'Gupta Supplies', outstanding: '590.00' },
    ])
    expect(result.link.href).toBe('/app/reports?tab=ageing')
  })

  test('sales_purchase_summary groups a period by item and skips cancelled', async () => {
    const tools = createAssistantTools(buildDeps())
    const result = await tools.run(
      'sales_purchase_summary',
      {
        kind: 'sales',
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        groupBy: 'item',
      },
      context,
    )
    expect(result.data).toEqual({
      kind: 'sales',
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      documentCount: 2,
      taxableAmount: '3500.00',
      gstAmount: '180.00',
      totalAmount: '3680.00',
      groups: [
        { name: 'Sugar', quantity: '5', taxableAmount: '2500.00' },
        { name: 'Rice', quantity: '10', taxableAmount: '1000.00' },
      ],
    })
    expect(result.link.href).toBe('/app/sales')
  })

  test('gstr3b_summary computes net GST payable for the period', async () => {
    const tools = createAssistantTools(buildDeps())
    const result = await tools.run(
      'gstr3b_summary',
      { periodStart: '2026-10-01', periodEnd: '2026-10-31' },
      context,
    )
    expect(result.data).toMatchObject({
      outputGst: '180.00',
      inputGst: '90.00',
      netGstPayable: '90.00',
    })
    expect(result.link.href).toBe('/app/reports?tab=gstr3b')
  })

  test('stock_on_hand filters by item name within the company', async () => {
    const tools = createAssistantTools(buildDeps())
    const result = await tools.run(
      'stock_on_hand',
      { itemName: 'rice' },
      context,
    )
    expect(result.data).toEqual({
      items: [{ name: 'Rice', quantity: '40', unit: 'kg' }],
    })
    expect(result.link.href).toBe('/app/reports?tab=stock')
  })

  test('cash_bank_balances reads only cash and bank ledgers', async () => {
    const tools = createAssistantTools(buildDeps())
    const result = await tools.run('cash_bank_balances', {}, context)
    expect(result.data).toEqual({
      accounts: [
        { name: 'Cash', balance: '1500.00', side: 'debit' },
        { name: 'Bank', balance: '2500.00', side: 'debit' },
      ],
    })
    expect(result.link.href).toBe('/app/reports?tab=trial')
  })

  test('rejects unknown tools and invalid input', async () => {
    const tools = createAssistantTools(buildDeps())
    await expect(tools.run('run_sql', {}, context)).rejects.toThrow(
      /Unknown tool/,
    )
    await expect(
      tools.run('ageing', { kind: 'everything' }, context),
    ).rejects.toThrow()
  })
})
