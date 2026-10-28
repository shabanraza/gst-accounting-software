import { DomainError } from '#/lib/domain-error.ts'
import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type {
  LedgerEntryRecord,
  LedgerPostingRepository,
} from '#/features/accounting/posting-engine.ts'
import type {
  StockBalanceRepository,
  StockMovementRecord,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

export type OpeningStockAccounts = {
  stockAccountId: string
  openingBalanceAccountId: string
}

export type PostOpeningStockInput = OpeningStockAccounts & {
  companyId: string
  itemId: string
  itemName: string
  unit: string
  quantity: string
  rate: string
  occurredOn: string
  referenceType: string
  referenceId: string
}

export class MissingOpeningStockLedgerError extends DomainError {
  constructor() {
    super(
      'Stock In Hand and Opening Balance ledgers are required to record opening stock',
    )
    this.name = 'MissingOpeningStockLedgerError'
  }
}

export async function resolveOpeningStockAccounts(
  ledgers: LedgerAccountRepository,
  companyId: string,
): Promise<OpeningStockAccounts> {
  const accounts = await ledgers.listByCompanyId(companyId)
  const idFor = (systemKey: string) =>
    accounts.find((account) => account.systemKey === systemKey)?.id
  const stockAccountId = idFor('stock_in_hand')
  const openingBalanceAccountId = idFor('opening_balance')

  if (!stockAccountId || !openingBalanceAccountId) {
    throw new MissingOpeningStockLedgerError()
  }

  return { stockAccountId, openingBalanceAccountId }
}

export function openingStockValue(quantity: string, rate: string): string {
  return new Decimal(quantity).times(rate || '0').toFixed(2)
}

/** Opening stock in at quantity × rate: Dr Stock In Hand, Cr Opening Balance. */
export async function postOpeningStock(
  deps: {
    stock: StockMovementRepository & StockBalanceRepository
    posting: LedgerPostingRepository
  },
  input: PostOpeningStockInput,
): Promise<{
  movement: StockMovementRecord
  ledgerEntry: LedgerEntryRecord | null
}> {
  const value = openingStockValue(input.quantity, input.rate)
  const movement = await recordStockMovement(deps.stock, deps.stock, {
    companyId: input.companyId,
    itemId: input.itemId,
    itemName: input.itemName,
    movementType: 'opening',
    quantity: input.quantity,
    unit: input.unit,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    occurredOn: input.occurredOn,
    value,
  })

  if (new Decimal(value).isZero()) {
    return { movement, ledgerEntry: null }
  }

  const ledgerEntry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.occurredOn,
    narration: `Opening stock: ${input.itemName}`,
    voucherType: 'journal',
    lines: [
      { ledgerAccountId: input.stockAccountId, debit: value, credit: '0.00' },
      {
        ledgerAccountId: input.openingBalanceAccountId,
        debit: '0.00',
        credit: value,
      },
    ],
  })

  return { movement, ledgerEntry }
}
