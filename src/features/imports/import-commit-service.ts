import {
  dryRunImportItems,
  dryRunImportOpeningBalances,
  dryRunImportOpeningStock,
  dryRunImportParties,
} from '#/features/imports/import-dry-run-service.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import { recordStockMovement } from '#/features/inventory/stock-movement-service.ts'
import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'
import { listLedgerAccountsByCompany } from '#/features/accounting/chart-of-accounts.ts'

import type {
  ImportItemRow,
  ImportOpeningBalanceRow,
  ImportPartyRow,
  ImportStockRow,
} from '#/features/imports/import-dry-run-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'

export type CommitImportResult = {
  createdCount: number
  skippedCount: number
  errors: Array<{ rowNumber: number; messages: Array<string> }>
  wroteData: true
}

export async function commitImportParties(
  repository: PartyRepository,
  input: {
    companyId: string
    rows: Array<ImportPartyRow>
    receivableAccountId: string
    payableAccountId: string
  },
): Promise<CommitImportResult> {
  const dryRun = dryRunImportParties(input.rows)
  if (dryRun.errors.length > 0) {
    return {
      createdCount: 0,
      skippedCount: dryRun.errors.length,
      errors: dryRun.errors,
      wroteData: true,
    }
  }

  let createdCount = 0
  for (const row of input.rows) {
    const partyType = row.partyType as 'customer' | 'supplier' | 'both'
    await createParty(repository, {
      companyId: input.companyId,
      name: row.name,
      partyType,
      gstin: row.gstin,
      stateCode: row.stateCode,
      creditLimit: null,
      paymentTermsDays: 30,
      receivableAccountId:
        partyType === 'supplier' ? null : input.receivableAccountId,
      payableAccountId:
        partyType === 'customer' ? null : input.payableAccountId,
    })
    createdCount += 1
  }

  return {
    createdCount,
    skippedCount: 0,
    errors: [],
    wroteData: true,
  }
}

export async function commitImportOpeningStock(
  items: ItemRepository,
  stock: StockMovementRepository & StockBalanceRepository,
  input: {
    companyId: string
    rows: Array<ImportStockRow>
    occurredOn: string
  },
): Promise<CommitImportResult> {
  const dryRun = dryRunImportOpeningStock(input.rows)
  if (dryRun.errors.length > 0) {
    return {
      createdCount: 0,
      skippedCount: dryRun.errors.length,
      errors: dryRun.errors,
      wroteData: true,
    }
  }

  let createdCount = 0
  for (const row of input.rows) {
    const item = await createItem(items, {
      companyId: input.companyId,
      name: row.itemName,
      hsnCode: '0000',
      gstRate: '0.00',
      baseUnit: row.unit,
      purchaseRate: row.rate,
      saleRate: row.rate,
      tracksInventory: true,
    })
    await recordStockMovement(stock, stock, {
      companyId: input.companyId,
      itemId: item.id,
      movementType: 'opening',
      quantity: row.quantity,
      unit: row.unit,
      referenceType: 'import_opening',
      referenceId: item.id,
      occurredOn: input.occurredOn,
    })
    createdCount += 1
  }

  return {
    createdCount,
    skippedCount: 0,
    errors: [],
    wroteData: true,
  }
}

export async function commitImportItems(
  items: ItemRepository,
  input: {
    companyId: string
    rows: Array<ImportItemRow>
  },
): Promise<CommitImportResult> {
  const dryRun = dryRunImportItems(input.rows)
  if (dryRun.errors.length > 0) {
    return {
      createdCount: 0,
      skippedCount: dryRun.errors.length,
      errors: dryRun.errors,
      wroteData: true,
    }
  }

  let createdCount = 0
  for (const row of input.rows) {
    await createItem(items, {
      companyId: input.companyId,
      name: row.name,
      hsnCode: row.hsn,
      gstRate: '0.00',
      baseUnit: row.unit,
      purchaseRate: row.rate,
      saleRate: row.rate,
      tracksInventory: true,
    })
    createdCount += 1
  }

  return {
    createdCount,
    skippedCount: 0,
    errors: [],
    wroteData: true,
  }
}

export async function commitImportOpeningBalances(
  ledgers: LedgerAccountRepository,
  posting: LedgerPostingRepository,
  input: {
    companyId: string
    entryDate: string
    rows: Array<ImportOpeningBalanceRow>
  },
): Promise<CommitImportResult> {
  const dryRun = dryRunImportOpeningBalances(input.rows)
  if (dryRun.errors.length > 0) {
    return {
      createdCount: 0,
      skippedCount: dryRun.errors.length,
      errors: dryRun.errors,
      wroteData: true,
    }
  }

  const accounts = await listLedgerAccountsByCompany(ledgers, input.companyId)
  const accountByCode = new Map(accounts.map((account) => [account.code, account]))
  const lines: Array<{
    ledgerAccountId: string
    debit: string
    credit: string
  }> = []

  for (const [index, row] of input.rows.entries()) {
    const account = accountByCode.get(row.ledgerCode.trim())
    if (!account) {
      return {
        createdCount: 0,
        skippedCount: input.rows.length,
        errors: [
          {
            rowNumber: index + 1,
            messages: [`Ledger code not found: ${row.ledgerCode}`],
          },
        ],
        wroteData: true,
      }
    }

    const debit = row.openingDebit.trim() || '0.00'
    const credit = row.openingCredit.trim() || '0.00'
    if (Number(debit) > 0) {
      lines.push({
        ledgerAccountId: account.id,
        debit,
        credit: '0.00',
      })
    }
    if (Number(credit) > 0) {
      lines.push({
        ledgerAccountId: account.id,
        debit: '0.00',
        credit,
      })
    }
  }

  await postLedgerEntry(posting, {
    companyId: input.companyId,
    entryDate: input.entryDate,
    narration: 'Imported opening balances',
    voucherType: 'journal',
    lines,
  })

  return {
    createdCount: input.rows.length,
    skippedCount: 0,
    errors: [],
    wroteData: true,
  }
}
