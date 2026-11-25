export type SessionGateAction = 'wait' | 'ready' | 'login' | 'retry'

/**
 * Only a missing user or a 401 means signed out. Any other failure (a 500
 * while the database wakes up, a dropped connection) is retried instead of
 * sending a signed-in user to the login page.
 */
export function sessionGateAction(state: {
  isPending: boolean
  hasUser: boolean
  error: unknown
}): SessionGateAction {
  if (state.isPending) return 'wait'
  if (state.hasUser) return 'ready'
  if (!state.error) return 'login'
  const status =
    typeof state.error === 'object' && 'status' in state.error
      ? state.error.status
      : undefined
  return status === 401 ? 'login' : 'retry'
}
