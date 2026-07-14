import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLiveQuery } from '@tanstack/react-db'

import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  getItemsCollection,
  getPartiesCollection,
} from '#/features/masters/master-data-collections.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'

type MasterListResult<T> = {
  data: Array<T>
  isLoading: boolean
  isReady: boolean
  isError: boolean
}

export function usePartiesList(): MasterListResult<PartyRecord> {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady: isWorkspaceReady } = useWorkspace()
  const enabled = Boolean(companyId) && isWorkspaceReady

  const collection = React.useMemo(() => {
    if (!companyId) {
      return null
    }

    const listOptions = trpc.parties.list.queryOptions({ companyId })
    return getPartiesCollection(companyId, queryClient, listOptions)
  }, [companyId, queryClient, trpc])

  const live = useLiveQuery(
    (q) =>
      enabled && collection ? q.from({ parties: collection }) : undefined,
    [collection, enabled],
  )

  return {
    data: live.data ?? [],
    isLoading: enabled && live.isLoading,
    isReady: enabled && live.isReady,
    isError: enabled && live.isError,
  }
}

export function useItemsList(): MasterListResult<ItemRecord> {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady: isWorkspaceReady } = useWorkspace()
  const enabled = Boolean(companyId) && isWorkspaceReady

  const collection = React.useMemo(() => {
    if (!companyId) {
      return null
    }

    const listOptions = trpc.inventory.listItems.queryOptions({ companyId })
    return getItemsCollection(companyId, queryClient, listOptions)
  }, [companyId, queryClient, trpc])

  const live = useLiveQuery(
    (q) => (enabled && collection ? q.from({ items: collection }) : undefined),
    [collection, enabled],
  )

  return {
    data: live.data ?? [],
    isLoading: enabled && live.isLoading,
    isReady: enabled && live.isReady,
    isError: enabled && live.isError,
  }
}
