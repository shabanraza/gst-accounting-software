import { authClient } from './auth-client.ts'
import { clearSessionToken } from './auth-storage.ts'

let sessionExpired = false
let sessionExpiredListeners = new Set<() => void>()

export function isSessionExpired() {
  return sessionExpired
}

export function subscribeSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener)
  return () => {
    sessionExpiredListeners.delete(listener)
  }
}

function notifySessionExpired() {
  sessionExpired = true
  for (const listener of sessionExpiredListeners) {
    listener()
  }
}

export function resetSessionExpiredState() {
  sessionExpired = false
}

export async function handleUnauthorizedSession() {
  await clearSessionToken()
  try {
    await authClient.signOut()
  } catch {
    // Ignore sign-out failures when the token is already invalid.
  }
  notifySessionExpired()
}

export async function clearAuthSession() {
  sessionExpired = false
  await clearSessionToken()
  try {
    await authClient.signOut()
  } catch {
    // Ignore sign-out failures during manual sign-out.
  }
}
