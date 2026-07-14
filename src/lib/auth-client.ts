import { createAuthClient } from 'better-auth/react'

import { getServerBaseUrl } from '#/lib/server-base-url.ts'

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : getServerBaseUrl() || undefined,
})
