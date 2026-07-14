import {
  demoItems,
  demoParties,
  godowns as demoGodownNames,
} from '#/features/app-shell/data/voucher-demo-masters.ts'
import { createItemWithOpening } from '#/features/inventory/create-item-with-opening.ts'
import {
  createGodown,
  DuplicateGodownNameError,
  ensureDefaultGodowns,
} from '#/features/inventory/godown-service.ts'
import { listItemsByCompany } from '#/features/inventory/item-service.ts'
import {
  DEFAULT_OPENING_STOCK_QUANTITY,
  ensureInventoryOpeningStock,
} from '#/features/inventory/opening-stock.ts'
import { createParty } from '#/features/parties/party-service.ts'

import type { GodownRepository } from '#/features/inventory/godown-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'

export { DEFAULT_OPENING_STOCK_QUANTITY } from '#/features/inventory/opening-stock.ts'

export type CompanyStarterDataDependencies = {
  parties: PartyRepository
  items: ItemRepository
  stock: StockMovementRepository & StockBalanceRepository
  godowns: GodownRepository
}

export type SeedCompanyStarterDataInput = {
  companyId: string
  financialYearStart: string
  ledgerBySystemKey: Record<string, string>
}

export async function ensureStarterGodowns(
  godowns: GodownRepository,
  companyId: string,
) {
  await ensureDefaultGodowns(godowns, companyId)

  for (const name of demoGodownNames) {
    try {
      await createGodown(godowns, { companyId, name })
    } catch (error) {
      if (!(error instanceof DuplicateGodownNameError)) {
        throw error
      }
    }
  }

  return godowns.listByCompanyId(companyId)
}

export async function seedCompanyStarterData(
  deps: CompanyStarterDataDependencies,
  input: SeedCompanyStarterDataInput,
) {
  await ensureStarterGodowns(deps.godowns, input.companyId)

  const receivableAccountId = input.ledgerBySystemKey.customer_receivable
  const payableAccountId = input.ledgerBySystemKey.supplier_payable

  if (receivableAccountId && payableAccountId) {
    const existingParties = await deps.parties.listByCompanyId(input.companyId)
    const existingPartyNames = new Set(
      existingParties.map((party) => party.name.toLowerCase()),
    )

    for (const demo of demoParties) {
      if (existingPartyNames.has(demo.name.toLowerCase())) {
        continue
      }

      await createParty(deps.parties, {
        companyId: input.companyId,
        name: demo.name,
        partyType: demo.partyType,
        gstin: demo.gstin,
        stateCode: demo.stateCode,
        creditLimit: null,
        paymentTermsDays: demo.paymentTermsDays,
        receivableAccountId:
          demo.partyType === 'supplier' ? null : receivableAccountId,
        payableAccountId:
          demo.partyType === 'customer' ? null : payableAccountId,
      })
    }

    const existingItems = await listItemsByCompany(deps.items, input.companyId)
    const existingItemNames = new Set(
      existingItems.map((item) => item.name.toLowerCase()),
    )

    for (const demo of demoItems) {
      if (existingItemNames.has(demo.name.toLowerCase())) {
        continue
      }

      await createItemWithOpening(deps.items, deps.stock, {
        companyId: input.companyId,
        name: demo.name,
        alias: demo.alias,
        itemGroup: demo.group,
        hsnCode: demo.hsnCode,
        gstRate: demo.gstRate,
        baseUnit: demo.baseUnit,
        alternateUnit: demo.altUnit ?? undefined,
        conversionFactor: demo.conversionFactor ?? undefined,
        purchaseRate: demo.purchaseRate,
        saleRate: demo.saleRate,
        tracksInventory: demo.tracksInventory,
        openingQuantity: demo.tracksInventory
          ? DEFAULT_OPENING_STOCK_QUANTITY
          : null,
        openingOccurredOn: input.financialYearStart,
      })
    }
  }

  await ensureInventoryOpeningStock(deps.items, deps.stock, {
    companyId: input.companyId,
    occurredOn: input.financialYearStart,
  })

  return {
    parties: await deps.parties.listByCompanyId(input.companyId),
    items: await listItemsByCompany(deps.items, input.companyId),
  }
}
