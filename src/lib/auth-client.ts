import { createAuthClient } from 'better-auth/react'

import { getServerBaseUrl } from '#/lib/server-base-url.ts'

function getAuthBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  try {
    return getServerBaseUrl()
  } catch {
    return undefined
  }
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
})
