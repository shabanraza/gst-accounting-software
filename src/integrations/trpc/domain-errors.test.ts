import { TRPCError } from '@trpc/server'
import { describe, expect, test } from 'vitest'

import { InsufficientStockError } from '#/features/inventory/stock-movement-service.ts'
import { DuplicatePartyNameError } from '#/features/parties/party-service.ts'
import { InvoiceNotFoundError } from '#/features/sales/sales-invoice-service.ts'
import { createTRPCRouter, publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCContext } from '#/integrations/trpc/init.ts'

const context: TRPCContext = {
  session: null,
  request: new Request('http://localhost/api/trpc'),
}

function callerThrowing(error: Error) {
  return createTRPCRouter({
    fail: publicProcedure.mutation(() => {
      throw error
    }),
  }).createCaller(context)
}

async function caughtCode(error: Error) {
  const caught = await callerThrowing(error)
    .fail()
    .catch((reason: unknown) => reason)
  expect(caught).toBeInstanceOf(TRPCError)
  return caught as TRPCError
}

describe('domain error mapping', () => {
  test('business-rule failures are client errors, not 500s', async () => {
    const error = await caughtCode(
      new InsufficientStockError('item-1', '5', '0'),
    )
    expect(error.code).toBe('BAD_REQUEST')
    expect(error.message).toContain('Insufficient stock')
  })

  test('missing records map to NOT_FOUND', async () => {
    expect((await caughtCode(new InvoiceNotFoundError('inv-1'))).code).toBe(
      'NOT_FOUND',
    )
  })

  test('duplicates map to CONFLICT', async () => {
    expect((await caughtCode(new DuplicatePartyNameError('Acme'))).code).toBe(
      'CONFLICT',
    )
  })

  test('unexpected errors stay internal', async () => {
    expect((await caughtCode(new Error('boom'))).code).toBe(
      'INTERNAL_SERVER_ERROR',
    )
  })
})
