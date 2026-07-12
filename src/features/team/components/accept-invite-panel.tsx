import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { WORKSPACE_COMPANY_KEY } from '#/features/app-shell/workspace.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function AcceptInvitePanel() {
  const navigate = useNavigate()
  const trpc = useTRPC()
  const { token } = useSearch({ from: '/accept-invite' })
  const acceptInvite = useMutation(trpc.team.acceptInvite.mutationOptions())
  const [error, setError] = React.useState<string | null>(null)

  async function handleAccept() {
    if (!token) {
      setError('This invite link is invalid.')
      return
    }
    setError(null)
    try {
      const result = await acceptInvite.mutateAsync({ token })
      window.localStorage.setItem(WORKSPACE_COMPANY_KEY, result.companyId)
      void navigate({ to: '/app/dashboard' })
    } catch (err) {
      setError(getFormErrorMessage(err, 'Unable to accept invite'))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">Join company</CardTitle>
          <CardDescription>
            Accept your invitation to access the company books.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click accept to join the workspace you were invited to.
            </p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={acceptInvite.isPending || !token}
            onClick={() => void handleAccept()}
          >
            {acceptInvite.isPending ? 'Joining…' : 'Accept invite'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
