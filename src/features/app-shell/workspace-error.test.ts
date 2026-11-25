import { TRPCClientError } from '@trpc/client'
import { describe, expect, test } from 'vitest'

import { workspaceErrorAction } from '#/features/app-shell/workspace-error.ts'

function trpcError(code: string, message: string) {
  return new TRPCClientError(message, {
    result: { error: { message, code: -32004, data: { code } } },
  })
}

describe('workspaceErrorAction', () => {
  test('an account with no company goes to company setup', () => {
    expect(
      workspaceErrorAction(
        trpcError('NOT_FOUND', 'No company found for this account'),
      ),
    ).toBe('onboarding')
  })

  test('any other failure offers a retry instead of a dead end', () => {
    expect(
      workspaceErrorAction(trpcError('INTERNAL_SERVER_ERROR', 'boom')),
    ).toBe('retry')
    expect(workspaceErrorAction(new TypeError('Failed to fetch'))).toBe(
      'retry',
    )
    expect(workspaceErrorAction('weird')).toBe('retry')
  })
})
