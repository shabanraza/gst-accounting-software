import { z } from 'zod'

import { createItemWithOpening } from '#/features/inventory/create-item-with-opening.ts'
import {
  DEFAULT_GODOWN_NAME,
  createGodown,
  deleteGodown,
  listGodownsByCompany,
  setDefaultGodown,
  updateGodown,
} from '#/features/inventory/godown-service.ts'
import {
  assignMissingBarcodes,
  createItem,
  listItemsByCompany,
  updateItem,
} from '#/features/inventory/item-service.ts'
import {
  createPriceList,
  listPriceListItems,
  listPriceListsByCompany,
  resolveItemRateForVoucher,
  setPriceListItemRate,
} from '#/features/inventory/price-list-service.ts'
import { needsRestock } from '#/features/inventory/low-stock.ts'
import { foldGodownStock } from '#/features/inventory/godown-stock-service.ts'
import {
  postGodownTransfer,
  postStockAdjustment,
} from '#/features/inventory/stock-journal-service.ts'
import { buildStockLedger } from '#/features/inventory/stock-ledger-service.ts'
import {
  getCurrentStock,
  recordStockMovement,
} from '#/features/inventory/stock-movement-service.ts'
import { averageRate } from '#/features/inventory/stock-valuation-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { PostingTransaction } from '#/features/accounting/posting-transaction.ts'
import type { FinancialYearRepository } from '#/features/companies/financial-year-service.ts'
import type { GodownRepository } from '#/features/inventory/godown-service.ts'
import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type {
  PriceListItemRepository,
  PriceListRepository,
} from '#/features/inventory/price-list-service.ts'
import type {
  StockBalanceRepository,
  StockMovementRepository,
} from '#/features/inventory/stock-movement-service.ts'

const createItemInputSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  alias: z.string().optional(),
  barcode: z.string().optional(),
  itemGroup: z.string().optional(),
  hsnCode: z.string().min(1),
  gstRate: z.string().min(1),
  baseUnit: z.string().min(1),
  alternateUnit: z.string().optional(),
  conversionFactor: z.string().optional(),
  mrp: z.string().optional(),
  reorderLevel: z.string().optional(),
  purchaseRate: z.string().min(1),
  saleRate: z.string().min(1),
  tracksInventory: z.boolean(),
})

const createItemWithOpeningInputSchema = createItemInputSchema.extend({
  openingQuantity: z.string().nullable().optional(),
  openingOccurredOn: z.string().optional(),
})

const updateItemInputSchema = createItemInputSchema.extend({
  itemId: z.string().uuid(),
})

const assignBarcodesInputSchema = z.object({
  companyId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1).max(500),
})

const stockMovementInputSchema = z.object({
  companyId: z.string().uuid(),
  itemId: z.string().uuid(),
  movementType: z.enum([
    'opening',
    'purchase_in',
    'sale_out',
    'purchase_return_out',
    'sales_return_in',
    'adjustment',
  ]),
  quantity: z.string().min(1),
  unit: z.string().min(1),
  referenceType: z.string().min(1),
  referenceId: z.string().min(1),
  occurredOn: z.string().min(1),
})

const stockBalanceInputSchema = z.object({
  companyId: z.string().uuid(),
  itemId: z.string().uuid(),
})

const stockJournalLinesSchema = z
  .array(
    z.object({
      itemId: z.string().uuid(),
      quantity: z.string().min(1),
    }),
  )
  .min(1)
  .max(200)

const stockAdjustmentInputSchema = z.object({
  companyId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  godownName: z.string().min(1),
  reason: z.enum(['physical_count', 'damage', 'shrinkage', 'other']),
  narration: z.string().max(500).optional(),
  lines: stockJournalLinesSchema,
})

const godownTransferInputSchema = z.object({
  companyId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fromGodown: z.string().min(1),
  toGodown: z.string().min(1),
  lines: stockJournalLinesSchema,
})

const listByCompanyInputSchema = z.object({
  companyId: z.string().uuid(),
})

const createGodownInputSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  isDefault: z.boolean().optional(),
})

const updateGodownInputSchema = z.object({
  companyId: z.string().uuid(),
  godownId: z.string().uuid(),
  name: z.string().min(1),
})

const godownIdInputSchema = z.object({
  companyId: z.string().uuid(),
  godownId: z.string().uuid(),
})

const createPriceListInputSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
})

const listPriceListItemsInputSchema = z.object({
  companyId: z.string().uuid(),
  priceListId: z.string().uuid(),
})

const setPriceListItemRateInputSchema = z.object({
  companyId: z.string().uuid(),
  priceListId: z.string().uuid(),
  itemId: z.string().uuid(),
  rate: z.string().min(1),
})

const resolveItemRateInputSchema = z.object({
  companyId: z.string().uuid(),
  priceListId: z.string().uuid().nullable().optional(),
  itemId: z.string().uuid(),
  mode: z.enum(['sales', 'purchase']),
  saleRate: z.string().min(1),
  purchaseRate: z.string().min(1),
})

async function assertPriceListForCompany(
  priceListRepository: PriceListRepository,
  companyId: string,
  priceListId: string,
) {
  const lists = await listPriceListsByCompany(priceListRepository, companyId)
  if (!lists.some((list) => list.id === priceListId)) {
    throw new Error('Price list not found for company')
  }
}

export const createInventoryRouter = (
  itemRepository: ItemRepository,
  stockStore: StockMovementRepository & StockBalanceRepository,
  godownRepository: GodownRepository,
  priceListRepository: PriceListRepository & PriceListItemRepository,
  ledgerAccountRepository: LedgerAccountRepository,
  postingTransaction: PostingTransaction,
  financialYearRepository: FinancialYearRepository,
) =>
  ({
    listGodowns: capabilityProcedure('view')
      .input(listByCompanyInputSchema)
      .query(({ input }) => {
        return listGodownsByCompany(godownRepository, input.companyId)
      }),
    createGodown: capabilityProcedure('manage_inventory')
      .input(createGodownInputSchema)
      .mutation(({ input }) => {
        return createGodown(godownRepository, input)
      }),
    updateGodown: capabilityProcedure('manage_inventory')
      .input(updateGodownInputSchema)
      .mutation(({ input }) => {
        return updateGodown(godownRepository, input)
      }),
    deleteGodown: capabilityProcedure('manage_inventory')
      .input(godownIdInputSchema)
      .mutation(({ input }) => {
        return deleteGodown(
          godownRepository,
          input.companyId,
          input.godownId,
          stockStore,
        )
      }),
    setDefaultGodown: capabilityProcedure('manage_inventory')
      .input(godownIdInputSchema)
      .mutation(({ input }) => {
        return setDefaultGodown(
          godownRepository,
          input.companyId,
          input.godownId,
        )
      }),
    listPriceLists: capabilityProcedure('view')
      .input(listByCompanyInputSchema)
      .query(({ input }) => {
        return listPriceListsByCompany(priceListRepository, input.companyId)
      }),
    createPriceList: capabilityProcedure('manage_masters')
      .input(createPriceListInputSchema)
      .mutation(({ input }) => {
        return createPriceList(priceListRepository, input)
      }),
    listPriceListItems: capabilityProcedure('view')
      .input(listPriceListItemsInputSchema)
      .query(async ({ input }) => {
        await assertPriceListForCompany(
          priceListRepository,
          input.companyId,
          input.priceListId,
        )
        return listPriceListItems(priceListRepository, input.priceListId)
      }),
    setPriceListItemRate: capabilityProcedure('manage_masters')
      .input(setPriceListItemRateInputSchema)
      .mutation(async ({ input }) => {
        await assertPriceListForCompany(
          priceListRepository,
          input.companyId,
          input.priceListId,
        )
        return setPriceListItemRate(priceListRepository, {
          priceListId: input.priceListId,
          itemId: input.itemId,
          rate: input.rate,
        })
      }),
    resolveItemRate: capabilityProcedure('view')
      .input(resolveItemRateInputSchema)
      .query(async ({ input }) => {
        if (input.priceListId) {
          await assertPriceListForCompany(
            priceListRepository,
            input.companyId,
            input.priceListId,
          )
        }
        return resolveItemRateForVoucher(priceListRepository, input)
      }),
    listItems: capabilityProcedure('view')
      .input(listByCompanyInputSchema)
      .query(({ input }) => {
        return listItemsByCompany(itemRepository, input.companyId)
      }),
    createItem: capabilityProcedure('manage_inventory')
      .input(createItemInputSchema)
      .mutation(({ input }) => {
        return createItem(itemRepository, input)
      }),
    createItemWithOpening: capabilityProcedure('manage_inventory')
      .input(createItemWithOpeningInputSchema)
      .mutation(({ input }) => {
        return postingTransaction(({ items, stock, posting }) =>
          createItemWithOpening(
            { items, stock, posting, ledgers: ledgerAccountRepository },
            input,
          ),
        )
      }),
    updateItem: capabilityProcedure('manage_inventory')
      .input(updateItemInputSchema)
      .mutation(({ input }) => {
        return updateItem(itemRepository, input)
      }),
    assignBarcodes: capabilityProcedure('manage_inventory')
      .input(assignBarcodesInputSchema)
      .mutation(({ input }) => {
        return assignMissingBarcodes(itemRepository, input)
      }),
    recordStockMovement: capabilityProcedure('manage_inventory')
      .input(stockMovementInputSchema)
      .mutation(({ input }) => {
        return recordStockMovement(stockStore, stockStore, input)
      }),
    postStockAdjustment: capabilityProcedure('manage_inventory')
      .input(stockAdjustmentInputSchema)
      .mutation(({ input }) => {
        return postingTransaction(({ stock, posting, sequences, items }) =>
          postStockAdjustment(
            {
              stock,
              posting,
              sequences,
              items,
              ledgers: ledgerAccountRepository,
              financialYears: financialYearRepository,
              godowns: godownRepository,
            },
            input,
          ),
        )
      }),
    postGodownTransfer: capabilityProcedure('manage_inventory')
      .input(godownTransferInputSchema)
      .mutation(({ input }) => {
        return postingTransaction(({ stock, sequences, items }) =>
          postGodownTransfer(
            {
              stock,
              sequences,
              items,
              financialYears: financialYearRepository,
              godowns: godownRepository,
            },
            input,
          ),
        )
      }),
    godownStock: capabilityProcedure('view')
      .input(listByCompanyInputSchema)
      .query(async ({ input }) => {
        const [items, movements, godowns] = await Promise.all([
          listItemsByCompany(itemRepository, input.companyId),
          stockStore.listByCompanyId(input.companyId),
          listGodownsByCompany(godownRepository, input.companyId),
        ])
        const defaultGodownName =
          (godowns.find((godown) => godown.isDefault) ?? godowns.at(0))?.name ??
          DEFAULT_GODOWN_NAME
        const itemById = new Map(items.map((item) => [item.id, item]))

        return foldGodownStock(movements, defaultGodownName).map((row) => ({
          ...row,
          itemName: itemById.get(row.itemId)?.name ?? 'Unknown item',
          unit: itemById.get(row.itemId)?.baseUnit ?? '',
        }))
      }),
    itemStockHistory: capabilityProcedure('view')
      .input(stockBalanceInputSchema)
      .query(({ input }) => {
        return buildStockLedger(
          { movements: stockStore },
          input.companyId,
          input.itemId,
        )
      }),
    getCurrentStock: capabilityProcedure('view')
      .input(stockBalanceInputSchema)
      .query(({ input }) => {
        return getCurrentStock(stockStore, input.companyId, input.itemId)
      }),
    listStockBalances: capabilityProcedure('view')
      .input(listByCompanyInputSchema)
      .query(async ({ input }) => {
        const [items, balances] = await Promise.all([
          listItemsByCompany(itemRepository, input.companyId),
          stockStore.listBalancesByCompany(input.companyId),
        ])
        const itemById = new Map(items.map((item) => [item.id, item]))

        return balances.map((balance) => {
          const item = itemById.get(balance.itemId)
          const tracksInventory = item?.tracksInventory ?? true
          return {
            itemId: balance.itemId,
            itemName: item?.name ?? 'Unknown item',
            unit: item?.baseUnit ?? '',
            quantity: balance.quantity,
            avgRate: averageRate(balance),
            tracksInventory,
            isLow: needsRestock({
              quantity: balance.quantity,
              reorderLevel: item?.reorderLevel,
              tracksInventory,
            }),
          }
        })
      }),
  }) satisfies TRPCRouterRecord
