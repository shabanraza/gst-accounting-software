import * as React from 'react'

import { analytics } from '#/features/analytics/client.ts'
import { authClient } from '#/lib/auth-client.ts'

/** Ties events to the signed-in account by its id, never name or email. */
export function AnalyticsIdentity() {
  const userId = authClient.useSession().data?.user.id

  React.useEffect(() => {
    if (userId) analytics.identify(userId)
  }, [userId])

  return null
}
