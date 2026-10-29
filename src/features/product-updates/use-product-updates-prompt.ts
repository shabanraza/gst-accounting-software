import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

/**
 * Returns a function that asks once whether the user wants product-update
 * emails. "Yes" records consent and subscribes; "No thanks" is remembered so
 * the question is never repeated. Closing the toast leaves it unanswered.
 */
export function useProductUpdatesPrompt() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const optIn = useMutation(trpc.preferences.setProductUpdates.mutationOptions())
  const decline = useMutation(
    trpc.preferences.declineProductUpdates.mutationOptions(),
  )

  return React.useCallback(async () => {
    const askKey = trpc.preferences.shouldAskProductUpdates.queryKey()
    const shouldAsk = await queryClient
      .fetchQuery({
        ...trpc.preferences.shouldAskProductUpdates.queryOptions(),
        staleTime: 0,
      })
      .catch(() => false)
    if (!shouldAsk) return

    const answered = () => queryClient.setQueryData(askKey, false)
    toast('Get product updates by email?', {
      id: 'product-updates-prompt',
      duration: Infinity,
      // Shown over the invoice preview sheet, which disables pointer events
      // outside itself; keep this toast's buttons clickable.
      className: 'pointer-events-auto',
      action: {
        label: 'Yes',
        onClick: () =>
          optIn.mutate(
            { enabled: true },
            {
              onSuccess: (next) => {
                answered()
                queryClient.setQueryData(
                  trpc.preferences.productUpdates.queryKey(),
                  next,
                )
                toast.success('You will get product update emails.')
              },
              onError: (error) =>
                toastActionError(error, 'Unable to turn on product updates'),
            },
          ),
      },
      cancel: {
        label: 'No thanks',
        onClick: () => decline.mutate(undefined, { onSuccess: answered }),
      },
    })
  }, [trpc, queryClient, optIn, decline])
}
