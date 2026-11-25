import { describe, expect, test } from 'vitest'

import { sessionGateAction } from '#/features/app-shell/session-gate.ts'

describe('sessionGateAction', () => {
  test('waits while the session is loading', () => {
    expect(
      sessionGateAction({ isPending: true, hasUser: false, error: null }),
    ).toBe('wait')
  })

  test('lets a signed-in user through', () => {
    expect(
      sessionGateAction({ isPending: false, hasUser: true, error: null }),
    ).toBe('ready')
  })

  test('sends a signed-out visitor to login', () => {
    expect(
      sessionGateAction({ isPending: false, hasUser: false, error: null }),
    ).toBe('login')
    expect(
      sessionGateAction({
        isPending: false,
        hasUser: false,
        error: { status: 401 },
      }),
    ).toBe('login')
  })

  test('retries instead of signing out when the session check fails', () => {
    expect(
      sessionGateAction({
        isPending: false,
        hasUser: false,
        error: { status: 500 },
      }),
    ).toBe('retry')
    expect(
      sessionGateAction({
        isPending: false,
        hasUser: false,
        error: new TypeError('fetch failed'),
      }),
    ).toBe('retry')
  })
})
