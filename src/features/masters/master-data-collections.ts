import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'

import type {
  QueryClient,
  QueryFunction,
  QueryKey,
} from '@tanstack/react-query'
import type { Collection } from '@tanstack/react-db'
import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'

const MASTER_DATA_STALE_TIME_MS = 60_000

type ListQueryOptions = {
  queryKey: QueryKey
  queryFn: QueryFunction<Array<PartyRecord | ItemRecord>>
}

const partiesCollectionCache = new Map<
  string,
  Collection<PartyRecord, string>
>()
const itemsCollectionCache = new Map<string, Collection<ItemRecord, string>>()

export function getPartiesCollection(
  companyId: string,
  queryClient: QueryClient,
  listOptions: ListQueryOptions,
): Collection<PartyRecord, string> {
  const cached = partiesCollectionCache.get(companyId)
  if (cached) {
    return cached
  }

  const collection = createCollection(
    queryCollectionOptions({
      queryKey: listOptions.queryKey,
      queryFn: listOptions.queryFn as QueryFunction<Array<PartyRecord>>,
      queryClient,
      getKey: (party) => party.id,
      staleTime: MASTER_DATA_STALE_TIME_MS,
    }),
  )

  partiesCollectionCache.set(companyId, collection)
  return collection
}

export function getItemsCollection(
  companyId: string,
  queryClient: QueryClient,
  listOptions: ListQueryOptions,
): Collection<ItemRecord, string> {
  const cached = itemsCollectionCache.get(companyId)
  if (cached) {
    return cached
  }

  const collection = createCollection(
    queryCollectionOptions({
      queryKey: listOptions.queryKey,
      queryFn: listOptions.queryFn as QueryFunction<Array<ItemRecord>>,
      queryClient,
      getKey: (item) => item.id,
      staleTime: MASTER_DATA_STALE_TIME_MS,
    }),
  )

  itemsCollectionCache.set(companyId, collection)
  return collection
}

export function clearMasterDataCollections(companyId?: string) {
  if (companyId) {
    partiesCollectionCache.delete(companyId)
    itemsCollectionCache.delete(companyId)
    return
  }

  partiesCollectionCache.clear()
  itemsCollectionCache.clear()
}
