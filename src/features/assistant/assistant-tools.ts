import Decimal from 'decimal.js'
import { z } from 'zod'

import {
  buildPayablesAgeing,
  buildReceivablesAgeing,
} from '#/features/accounting/ageing-service.ts'
import { buildTrialBalance } from '#/features/accounting/financial-reports.ts'
import { buildGstDocuments } from '#/features/gst/gst-report-documents.ts'
import { buildGstr3bReport } from '#/features/gst/gstr3b-report-service.ts'
import { buildStockSummary } from '#/features/inventory/stock-ledger-service.ts'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { StockBalanceRepository } from '#/features/inventory/stock-movement-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { CreditDebitNoteRepository } from '#/features/returns/credit-debit-note-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'

/**
 * Read-only tools for "Ask your books". Every tool wraps an existing report
 * service and is scoped to the company passed by the server in `context`;
 * the model never supplies a company id, and nothing here writes.
 */
export type AssistantToolDeps = {
  parties: PartyRepository
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  notes: CreditDebitNoteRepository
  items: ItemRepository
  stockBalances: StockBalanceRepository
  ledgers: LedgerAccountRepository
  postings: LedgerPostingRepository
}

export type AssistantToolContext = {
  companyId: string
  companyStateCode: string
}

export type AssistantLink = { label: string; href: string }

export type AssistantToolResult = { data: unknown; link: AssistantLink }

/** JSON-schema function definition, as Workers AI function calling expects. */
export type AssistantToolDefinition = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type AssistantToolset = {
  definitions: Array<AssistantToolDefinition>
  run: (
    name: string,
    input: unknown,
    context: AssistantToolContext,
  ) => Promise<AssistantToolResult>
}

const TOP_N = 5
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const money = (value: Decimal.Value) => new Decimal(value).toFixed(2)
const matches = (name: string, query: string) =>
  name.toLowerCase().includes(query.trim().toLowerCase())

const schemas = {
  party_balance: z.object({ partyName: z.string().min(1) }),
  ageing: z.object({ kind: z.enum(['receivables', 'payables']) }),
  sales_purchase_summary: z.object({
    kind: z.enum(['sales', 'purchases']),
    periodStart: isoDate,
    periodEnd: isoDate,
    groupBy: z.enum(['none', 'party', 'item']).default('none'),
  }),
  gstr3b_summary: z.object({ periodStart: isoDate, periodEnd: isoDate }),
  stock_on_hand: z.object({ itemName: z.string().optional() }),
  cash_bank_balances: z.object({}),
}

type ToolName = keyof typeof schemas

const definitions: Array<AssistantToolDefinition> = [
  {
    name: 'party_balance',
    description:
      'Outstanding receivable (customer owes us) and payable (we owe supplier) for parties whose name contains the given text. Use for "how much does X owe" or "X ka kitna baaki hai".',
    parameters: {
      type: 'object',
      properties: {
        partyName: {
          type: 'string',
          description: 'Part of the party name, in its original spelling.',
        },
      },
      required: ['partyName'],
    },
  },
  {
    name: 'ageing',
    description:
      'Receivables or payables ageing: totals by overdue bucket and the parties with the largest outstanding.',
    parameters: {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['receivables', 'payables'] } },
      required: ['kind'],
    },
  },
  {
    name: 'sales_purchase_summary',
    description:
      'Totals of posted sales invoices or purchase bills between two dates (inclusive), optionally grouped by party or item with the top entries by taxable value.',
    parameters: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['sales', 'purchases'] },
        periodStart: { type: 'string', description: 'YYYY-MM-DD' },
        periodEnd: { type: 'string', description: 'YYYY-MM-DD' },
        groupBy: { type: 'string', enum: ['none', 'party', 'item'] },
      },
      required: ['kind', 'periodStart', 'periodEnd'],
    },
  },
  {
    name: 'gstr3b_summary',
    description:
      'GSTR-3B summary for a period: outward taxable value, output GST, eligible ITC and net GST payable.',
    parameters: {
      type: 'object',
      properties: {
        periodStart: { type: 'string', description: 'YYYY-MM-DD' },
        periodEnd: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['periodStart', 'periodEnd'],
    },
  },
  {
    name: 'stock_on_hand',
    description:
      'Current stock quantity per item, optionally filtered to items whose name contains the given text.',
    parameters: {
      type: 'object',
      properties: { itemName: { type: 'string' } },
    },
  },
  {
    name: 'cash_bank_balances',
    description: 'Current balances of the cash and bank ledgers.',
    parameters: { type: 'object', properties: {} },
  },
]

function topGroups(
  groups: Map<string, { quantity: Decimal; taxable: Decimal }>,
  withQuantity: boolean,
) {
  return [...groups.entries()]
    .sort((left, right) => right[1].taxable.comparedTo(left[1].taxable))
    .slice(0, TOP_N)
    .map(([name, totals]) => ({
      name,
      ...(withQuantity ? { quantity: totals.quantity.toString() } : {}),
      taxableAmount: money(totals.taxable),
    }))
}

export function createAssistantTools(deps: AssistantToolDeps): AssistantToolset {
  const handlers: {
    [Name in ToolName]: (
      input: z.infer<(typeof schemas)[Name]>,
      context: AssistantToolContext,
    ) => Promise<AssistantToolResult>
  } = {
    async party_balance(input, { companyId }) {
      const [parties, invoices, bills] = await Promise.all([
        deps.parties.listByCompanyId(companyId),
        deps.invoices.listByCompanyId(companyId, { includeLines: false }),
        deps.bills.listByCompanyId(companyId, { includeLines: false }),
      ])
      const found = parties
        .filter((party) => matches(party.name, input.partyName))
        .slice(0, TOP_N)
        .map((party) => {
          const open = [
            ...invoices.filter(
              (row) =>
                row.customerId === party.id &&
                row.status !== 'cancelled' &&
                new Decimal(row.outstandingAmount).gt(0),
            ),
          ]
          const openBills = bills.filter(
            (row) =>
              row.supplierId === party.id &&
              new Decimal(row.outstandingAmount).gt(0),
          )
          const sum = (rows: Array<{ outstandingAmount: string }>) =>
            money(
              rows.reduce(
                (total, row) => total.plus(row.outstandingAmount),
                new Decimal(0),
              ),
            )
          return {
            name: party.name,
            receivable: sum(open),
            payable: sum(openBills),
            openDocuments: open.length + openBills.length,
          }
        })
      return {
        data: { parties: found },
        link: { label: 'Parties', href: '/app/masters/parties' },
      }
    },

    async ageing(input, { companyId }) {
      const report =
        input.kind === 'receivables'
          ? await buildReceivablesAgeing(deps, companyId)
          : await buildPayablesAgeing(deps, companyId)
      const byParty = new Map<string, Decimal>()
      for (const row of report.rows) {
        byParty.set(
          row.partyName,
          (byParty.get(row.partyName) ?? new Decimal(0)).plus(
            row.outstandingAmount,
          ),
        )
      }
      const total = Object.values(report.bucketTotals).reduce(
        (sum, value) => sum.plus(value),
        new Decimal(0),
      )
      return {
        data: {
          kind: input.kind,
          total: money(total),
          bucketTotals: report.bucketTotals,
          topParties: [...byParty.entries()]
            .sort((left, right) => right[1].comparedTo(left[1]))
            .slice(0, TOP_N)
            .map(([name, outstanding]) => ({
              name,
              outstanding: money(outstanding),
            })),
        },
        link: { label: 'Ageing report', href: '/app/reports?tab=ageing' },
      }
    },

    async sales_purchase_summary(input, { companyId }) {
      const range = {
        startDate: input.periodStart,
        endDate: input.periodEnd,
        includeLines: input.groupBy === 'item',
      }
      const documents =
        input.kind === 'sales'
          ? (await deps.invoices.listByCompanyId(companyId, range))
              .filter((row) => row.status !== 'cancelled')
              .map((row) => ({ ...row, date: row.invoiceDate }))
          : (await deps.bills.listByCompanyId(companyId, range)).map((row) => ({
              ...row,
              date: row.billDate,
            }))
      // Repositories may ignore the date range (in-memory), so filter again.
      const inPeriod = documents.filter(
        (row) => row.date >= input.periodStart && row.date <= input.periodEnd,
      )
      const items =
        input.groupBy === 'item'
          ? new Map(
              (await deps.items.listByCompanyId(companyId)).map((item) => [
                item.id,
                item.name,
              ]),
            )
          : new Map<string, string>()
      const groups = new Map<string, { quantity: Decimal; taxable: Decimal }>()
      const add = (name: string, quantity: Decimal.Value, taxable: string) => {
        const current = groups.get(name) ?? {
          quantity: new Decimal(0),
          taxable: new Decimal(0),
        }
        groups.set(name, {
          quantity: current.quantity.plus(quantity),
          taxable: current.taxable.plus(taxable),
        })
      }
      for (const row of inPeriod) {
        if (input.groupBy === 'party') {
          add(row.partyNameSnapshot, 0, row.taxableAmount)
        } else if (input.groupBy === 'item') {
          for (const line of row.lines) {
            add(
              items.get(line.itemId) ?? line.description,
              line.quantity,
              line.taxableAmount,
            )
          }
        }
      }
      const total = (pick: (row: (typeof inPeriod)[number]) => string) =>
        money(inPeriod.reduce((sum, row) => sum.plus(pick(row)), new Decimal(0)))
      return {
        data: {
          kind: input.kind,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          documentCount: inPeriod.length,
          taxableAmount: total((row) => row.taxableAmount),
          gstAmount: total((row) => row.totalGstAmount),
          totalAmount: total((row) => row.totalAmount),
          ...(input.groupBy === 'none'
            ? {}
            : { groups: topGroups(groups, input.groupBy === 'item') }),
        },
        link:
          input.kind === 'sales'
            ? { label: 'Sales invoices', href: '/app/sales' }
            : { label: 'Purchase bills', href: '/app/purchases' },
      }
    },

    async gstr3b_summary(input, { companyId, companyStateCode }) {
      const documents = await buildGstDocuments({
        companyId,
        companyStateCode,
        invoices: deps.invoices,
        bills: deps.bills,
        parties: deps.parties,
        notes: deps.notes,
      })
      const report = buildGstr3bReport({
        companyId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        documents,
      })
      const { companyId: _companyId, ...data } = report
      return {
        data,
        link: { label: 'GSTR-3B', href: '/app/reports?tab=gstr3b' },
      }
    },

    async stock_on_hand(input, { companyId }) {
      const rows = await buildStockSummary(
        { balances: deps.stockBalances, items: deps.items },
        companyId,
      )
      const query = input.itemName
      return {
        data: {
          items: rows
            .filter((row) => !query || matches(row.itemName, query))
            .slice(0, 10)
            .map((row) => ({
              name: row.itemName,
              quantity: row.quantityOnHand,
              unit: row.baseUnit,
            })),
        },
        link: { label: 'Stock summary', href: '/app/reports?tab=stock' },
      }
    },

    async cash_bank_balances(_input, { companyId }) {
      const [accounts, report] = await Promise.all([
        deps.ledgers.listByCompanyId(companyId),
        buildTrialBalance(deps, companyId),
      ])
      const cashBankIds = new Set(
        accounts
          .filter(
            (account) =>
              account.systemKey === 'cash' || account.systemKey === 'bank',
          )
          .map((account) => account.id),
      )
      return {
        data: {
          accounts: report.rows
            .filter((row) => cashBankIds.has(row.accountId))
            .map((row) => ({
              name: row.name,
              balance: money(row.balance),
              side: row.balanceType,
            })),
        },
        link: { label: 'Trial balance', href: '/app/reports?tab=trial' },
      }
    },
  }

  return {
    definitions,
    async run(name, input, context) {
      if (!Object.hasOwn(schemas, name)) {
        throw new Error(`Unknown tool: ${name}`)
      }
      const toolName = name as ToolName
      const parsed = schemas[toolName].parse(input ?? {})
      const handler = handlers[toolName] as (
        input: unknown,
        context: AssistantToolContext,
      ) => Promise<AssistantToolResult>
      return handler(parsed, context)
    },
  }
}
