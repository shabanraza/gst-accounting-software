import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Switch } from '#/components/ui/switch.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

const consentDate = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' })

export function ProductUpdatesCard() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const preference = useQuery(trpc.preferences.productUpdates.queryOptions())

  const update = useMutation({
    ...trpc.preferences.setProductUpdates.mutationOptions(),
    onSuccess: (next) => {
      queryClient.setQueryData(trpc.preferences.productUpdates.queryKey(), next)
      toast.success(
        next.enabled
          ? 'You will get product update emails.'
          : 'Product update emails turned off.',
      )
    },
    onError: (error) =>
      toastActionError(error, 'Unable to update your email preference'),
  })

  const enabled = update.isPending
    ? update.variables.enabled
    : (preference.data?.enabled ?? false)
  const consentedAt = preference.data?.enabled
    ? preference.data.consentedAt
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email</CardTitle>
        <CardDescription>
          Release notes when we ship new features and fixes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="product-updates">Email me product updates</Label>
          <Switch
            checked={enabled}
            disabled={preference.isPending || update.isPending}
            id="product-updates"
            onCheckedChange={(checked) => update.mutate({ enabled: checked })}
          />
        </div>
        {consentedAt ? (
          <p className="text-xs text-muted-foreground">
            Subscribed on {consentDate.format(consentedAt)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
