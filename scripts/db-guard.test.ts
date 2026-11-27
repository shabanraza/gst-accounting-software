import { describe, expect, test } from 'vitest'

import { schemaChangeRefusal } from './db-guard.ts'

const url = 'postgresql://user:secret@ep-example-123.neon.tech/neondb'

describe('schemaChangeRefusal', () => {
  test('refuses a database whose host has not been confirmed', () => {
    const message = schemaChangeRefusal({ databaseUrl: url })
    expect(message).toContain('ep-example-123.neon.tech')
    expect(message).toContain('DB_CONFIRM_HOST')
    expect(message).not.toContain('secret')
  })

  test('refuses when a different host was confirmed', () => {
    expect(
      schemaChangeRefusal({
        databaseUrl: url,
        confirmedHost: 'ep-other.neon.tech',
      }),
    ).not.toBeNull()
  })

  test('allows the exact host named for this run', () => {
    expect(
      schemaChangeRefusal({
        databaseUrl: url,
        confirmedHost: 'ep-example-123.neon.tech',
      }),
    ).toBeNull()
  })

  test.each(['localhost', '127.0.0.1', '[::1]'])(
    'allows a database on this computer (%s)',
    (host) => {
      expect(
        schemaChangeRefusal({
          databaseUrl: `postgresql://u:p@${host}:5432/app`,
        }),
      ).toBeNull()
    },
  )

  test('refuses an address it cannot read, without echoing it', () => {
    const message = schemaChangeRefusal({ databaseUrl: 'not a url secret' })
    expect(message).not.toBeNull()
    expect(message).not.toContain('secret')
    expect(schemaChangeRefusal({})).not.toBeNull()
  })
})
