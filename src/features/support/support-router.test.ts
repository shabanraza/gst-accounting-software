import { describe, expect, test, vi } from 'vitest'

import { buildProblemReportEmail } from '#/features/support/problem-report.ts'
import { createSupportRouter } from '#/features/support/support-router.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { TRPCContext } from '#/integrations/trpc/init.ts'

const reporter = { name: 'Asha', email: 'asha@example.com' }

describe('buildProblemReportEmail', () => {
  test('sends to the support inbox with reply-to set to the reporter', () => {
    const email = buildProblemReportEmail({
      description: 'Save button does nothing',
      route: '/app/sales/new',
      appVersion: '0.2.0',
      userAgent: 'Mozilla/5.0',
      reporter,
    })

    expect(email.to).toBe('support@hisaabkro.in')
    expect(email.replyTo).toBe('asha@example.com')
    expect(email.subject).toBe('Problem report (v0.2.0): Save button does nothing')
    expect(email.html).toContain('/app/sales/new')
    expect(email.html).toContain('Mozilla/5.0')
  })

  test('escapes HTML typed by the user', () => {
    const email = buildProblemReportEmail({
      description: '<img src=x onerror=alert(1)>',
      route: '/app/<b>',
      appVersion: '0.2.0',
      userAgent: '"><script>',
      reporter: { name: '<i>x</i>', email: 'a@example.com' },
    })

    expect(email.html).not.toContain('<img')
    expect(email.html).not.toContain('<script>')
    expect(email.html).not.toContain('<b>')
    expect(email.html).not.toContain('<i>')
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  test('keeps only the path of the route, never query or hash', () => {
    const email = buildProblemReportEmail({
      description: 'x',
      route: '/app/reports?from=2026-04-01&token=abc#section',
      appVersion: '0.2.0',
      userAgent: 'ua',
      reporter,
    })

    expect(email.html).toContain('/app/reports')
    expect(email.html).not.toContain('token')
    expect(email.html).not.toContain('section')
  })

  test('shortens long descriptions in the subject to one line', () => {
    const email = buildProblemReportEmail({
      description: `${'a'.repeat(100)}\nsecond line`,
      route: '/app',
      appVersion: '0.2.0',
      userAgent: 'ua',
      reporter,
    })

    expect(email.subject).toBe(`Problem report (v0.2.0): ${'a'.repeat(60)}…`)
  })
})

describe('supportRouter.reportProblem', () => {
  const input = {
    description: 'Totals look wrong on the bill screen',
    route: '/app/purchases/new',
    appVersion: '0.2.0',
    userAgent: 'Mozilla/5.0',
  }

  function caller(session: TRPCContext['session']) {
    const send = vi.fn(async () => {})
    const router = createTRPCRouter({ support: createSupportRouter({ send }) })
    return {
      send,
      caller: router.createCaller({
        session,
        request: new Request('http://localhost/api/trpc'),
      }),
    }
  }

  test('emails the report with the signed-in user as reporter', async () => {
    const { send, caller: api } = caller({
      user: { id: 'u1', email: 'asha@example.com', name: 'Asha' },
      session: { id: 's1', userId: 'u1' },
    })

    await expect(api.support.reportProblem(input)).resolves.toEqual({
      ok: true,
    })
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'support@hisaabkro.in',
        replyTo: 'asha@example.com',
      }),
    )
  })

  test('requires a signed-in user', async () => {
    const { send, caller: api } = caller(null)

    await expect(api.support.reportProblem(input)).rejects.toThrow(
      'UNAUTHORIZED',
    )
    expect(send).not.toHaveBeenCalled()
  })

  test('rejects an empty or oversized description', async () => {
    const { send, caller: api } = caller({
      user: { id: 'u1', email: 'asha@example.com', name: 'Asha' },
      session: { id: 's1', userId: 'u1' },
    })

    await expect(
      api.support.reportProblem({ ...input, description: '   ' }),
    ).rejects.toThrow()
    await expect(
      api.support.reportProblem({ ...input, description: 'a'.repeat(4001) }),
    ).rejects.toThrow()
    expect(send).not.toHaveBeenCalled()
  })
})
