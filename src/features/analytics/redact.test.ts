import { describe, expect, test } from 'vitest'

import { redactDeep, redactText } from '#/features/analytics/redact.ts'

describe('redactText', () => {
  test.each([
    [
      'https://hisaabkro.in/i/abc.DEF-123?x=1',
      'https://hisaabkro.in/i/[token]?x=1',
    ],
    ['/i/abc123', '/i/[token]'],
    [
      'https://hisaabkro.in/reset-password?token=s3cret',
      'https://hisaabkro.in/reset-password?token=[redacted]',
    ],
    [
      '/accept-invite?a=1&token=s3cret#top',
      '/accept-invite?a=1&token=[redacted]#top',
    ],
    [
      '/api/auth/reset-password/s3cret?callbackURL=%2Freset-password',
      '/api/auth/reset-password/[token]?callbackURL=%2Freset-password',
    ],
    [
      '/api/auth/callback/google?code=4%2Fabc&state=xyz',
      '/api/auth/callback/google?code=[redacted]&state=[redacted]',
    ],
    [
      '/login?next=%2Fx%3Ftoken%3Ds3cret',
      '/login?next=%2Fx%3Ftoken%3D[redacted]',
    ],
    ['No user asha@example.com here', 'No user [email] here'],
    [
      'Failed query: insert into "parties" values ($1)\nparams: Asha,98200',
      'Failed query: insert into "parties" values ($1)\nparams: [redacted]',
    ],
  ])('redacts %s', (input, expected) => {
    expect(redactText(input)).toBe(expected)
  })

  test('leaves ordinary pages and messages alone', () => {
    for (const value of [
      '/app/purchases/new',
      '/reset-password',
      '/invite/help',
      "Cannot read properties of undefined (reading 'name')",
    ]) {
      expect(redactText(value)).toBe(value)
    }
  })
})

describe('redactDeep', () => {
  test('cleans strings anywhere in an event and keeps other values', () => {
    const date = new Date()
    const event = {
      request: { url: 'https://x.in/i/tok' },
      breadcrumbs: [{ data: { to: '/reset-password?token=t' } }],
      count: 2,
      ok: true,
      none: null,
      date,
    }

    expect(redactDeep(event)).toEqual({
      request: { url: 'https://x.in/i/[token]' },
      breadcrumbs: [{ data: { to: '/reset-password?token=[redacted]' } }],
      count: 2,
      ok: true,
      none: null,
      date,
    })
    expect(event.request.url).toBe('https://x.in/i/tok')
  })

  test('survives circular references', () => {
    const event: Record<string, unknown> = { url: '/i/tok' }
    event.self = event

    expect(() => redactDeep(event)).not.toThrow()
  })
})
