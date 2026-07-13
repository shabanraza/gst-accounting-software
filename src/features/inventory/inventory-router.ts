import { z } from 'zod'

import { createItemWithOpening } from '#/features/inventory/create-item-with-opening.ts'
import {
  createGodown,
  deleteGodown,
  listGodownsByCompany,
  setDefaultGodown,
  updateGodown,
} from '#/features/inventory/godown-service.ts'
import {
  createItem,
  listItemsByCompany,
} from '#/features/inventory/item-service.ts'
import {
  createPriceList,
  listPriceListItems,
  listPriceListsByCompany,
  resolveItemRateForVoucher,
  setPriceListItemRate,
} from '#/features/inventory/price-list-service.ts'
import {
  getCurrentStock,
  recordStockMovement,
} from '#/features/inventory/stock-movement-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
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
  priceListId: z.string().uuid(),
})

const setPriceListItemRateInputSchema = z.object({
  companyId: z.string().uuid(),
  priceListId: z.string().uuid(),
  itemId: z.string().uuid(),
  rate: z.string().min(1),
})

const resolveItemRateInputSchema = z.object({
  priceListId: z.string().uuid().nullable().optional(),
  itemId: z.string().uuid(),
  mode: z.enum(['sales', 'purchase']),
  saleRate: z.string().min(1),
  purchaseRate: z.string().min(1),
})

export const createInventoryRouter = (
  itemRepository: ItemRepository,
  stockStore: StockMovementRepository & StockBalanceRepository,
  godownRepository: GodownRepository,
  priceListRepository: PriceListRepository & PriceListItemRepository,
) =>
  ({
    listGodowns: companyProcedure
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
    listPriceLists: publicProcedure
      .input(listByCompanyInputSchema)
      .query(({ input }) => {
        return listPriceListsByCompany(priceListRepository, input.companyId)
      }),
    createPriceList: capabilityProcedure('manage_masters')
      .input(createPriceListInputSchema)
      .mutation(({ input }) => {
        return createPriceList(priceListRepository, input)
      }),
    listPriceListItems: publicProcedure
      .input(listPriceListItemsInputSchema)
      .query(({ input }) => {
        return listPriceListItems(priceListRepository, input.priceListId)
      }),
    setPriceListItemRate: capabilityProcedure('manage_masters')
      .input(setPriceListItemRateInputSchema)
      .mutation(({ input }) => {
        return setPriceListItemRate(priceListRepository, {
          priceListId: input.priceListId,
          itemId: input.itemId,
          rate: input.rate,
        })
      }),
    resolveItemRate: publicProcedure
      .input(resolveItemRateInputSchema)
      .query(({ input }) => {
        return resolveItemRateForVoucher(priceListRepository, input)
      }),
    listItems: publicProcedure
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
        return createItemWithOpening(itemRepository, stockStore, input)
      }),
    recordStockMovement: capabilityProcedure('manage_inventory')
      .input(stockMovementInputSchema)
      .mutation(({ input }) => {
        return recordStockMovement(stockStore, stockStore, input)
      }),
    getCurrentStock: publicProcedure
      .input(stockBalanceInputSchema)
      .query(({ input }) => {
        return getCurrentStock(stockStore, input.companyId, input.itemId)
      }),
    listStockBalances: publicProcedure
      .input(listByCompanyInputSchema)
      .query(async ({ input }) => {
        const [items, balances] = await Promise.all([
          listItemsByCompany(itemRepository, input.companyId),
          stockStore.listBalancesByCompany(input.companyId),
        ])
        const itemById = new Map(items.map((item) => [item.id, item]))

        return balances.map((balance) => {
          const item = itemById.get(balance.itemId)
          return {
            itemId: balance.itemId,
            itemName: item?.name ?? 'Unknown item',
            unit: item?.baseUnit ?? '',
            quantity: balance.quantity,
            avgRate: item?.purchaseRate ?? '0.00',
            tracksInventory: item?.tracksInventory ?? true,
          }
        })
      }),
  }) satisfies TRPCRouterRecord
