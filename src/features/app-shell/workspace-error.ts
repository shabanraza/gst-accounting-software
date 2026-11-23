export type WorkspaceErrorAction = 'onboarding' | 'retry'

/**
 * A signed-in account with no company is sent to company setup; any other
 * workspace failure (a dropped connection, a server error) can be retried.
 */
export function workspaceErrorAction(error: unknown): WorkspaceErrorAction {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'code' in error.data
      ? error.data.code
      : undefined
  return code === 'NOT_FOUND' ? 'onboarding' : 'retry'
}
