import { describe, expect, test, vi } from 'vitest'

import {
  SUBMISSION_RATE_LIMIT,
  TooManySubmissionsError,
  contactInputSchema,
  feedbackInputSchema,
  submitMarketingForm,
  waitlistInputSchema,
} from '#/features/marketing/submission-service.ts'
import { InMemorySubmissionRepository } from '#/features/marketing/submission-store.ts'

const NOW = new Date('2026-10-27T10:00:00Z')

function setup() {
  const submissions = new InMemorySubmissionRepository()
  const notify = vi.fn(async () => {})
  return { submissions, notify, deps: { submissions, notify, now: () => NOW } }
}

const meta = { ipHash: 'ip-1', userAgent: 'test', sourcePath: '/' }

describe('marketing input schemas', () => {
  test('normalises waitlist email to trimmed lowercase', () => {
    const parsed = waitlistInputSchema.parse({ email: '  Owner@Shop.IN ' })
    expect(parsed.email).toBe('owner@shop.in')
  })

  test('rejects an invalid email', () => {
    expect(waitlistInputSchema.safeParse({ email: 'nope' }).success).toBe(false)
  })

  test('feedback requires a message and a 1–5 rating', () => {
    expect(
      feedbackInputSchema.safeParse({ rating: 6, message: 'Great' }).success,
    ).toBe(false)
    expect(
      feedbackInputSchema.safeParse({ rating: 4, message: '' }).success,
    ).toBe(false)
    expect(
      feedbackInputSchema.safeParse({ rating: 4, message: 'Great' }).success,
    ).toBe(true)
  })

  test('contact requires name, email and a meaningful message', () => {
    expect(
      contactInputSchema.safeParse({
        name: 'Asha',
        email: 'asha@shop.in',
        message: 'hi',
      }).success,
    ).toBe(false)
    const parsed = contactInputSchema.parse({
      name: ' Asha ',
      email: 'asha@shop.in',
      message: 'Need help migrating from BUSY.',
    })
    expect(parsed.name).toBe('Asha')
    expect(parsed.topic).toBe('other')
  })
})

describe('submitMarketingForm', () => {
  test('stores the submission and notifies the team', async () => {
    const { submissions, notify, deps } = setup()

    await submitMarketingForm(deps, {
      kind: 'contact',
      fields: {
        name: 'Asha',
        email: 'asha@shop.in',
        phone: undefined,
        topic: 'support',
        message: 'Need help migrating from BUSY.',
      },
      ...meta,
    })

    const stored = await submissions.list()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      kind: 'contact',
      email: 'asha@shop.in',
      status: 'new',
      ipHash: 'ip-1',
    })
    expect(notify).toHaveBeenCalledOnce()
  })

  test('silently drops a submission with the honeypot filled', async () => {
    const { submissions, notify, deps } = setup()

    const result = await submitMarketingForm(deps, {
      kind: 'waitlist',
      fields: { email: 'bot@spam.io' },
      honeypot: 'http://spam.io',
      ...meta,
    })

    expect(result).toEqual({ ok: true })
    expect(await submissions.list()).toHaveLength(0)
    expect(notify).not.toHaveBeenCalled()
  })

  test('treats a repeat waitlist email as success without a second row', async () => {
    const { submissions, notify, deps } = setup()
    const input = {
      kind: 'waitlist' as const,
      fields: { email: 'owner@shop.in' },
      ...meta,
    }

    await submitMarketingForm(deps, input)
    const result = await submitMarketingForm(deps, input)

    expect(result).toEqual({ ok: true })
    expect(await submissions.list()).toHaveLength(1)
    expect(notify).toHaveBeenCalledOnce()
  })

  test('rate limits a single IP within the window', async () => {
    const { deps } = setup()

    for (let index = 0; index < SUBMISSION_RATE_LIMIT.max; index++) {
      await submitMarketingForm(deps, {
        kind: 'feedback',
        fields: { rating: 5, message: `Note ${index}` },
        ...meta,
      })
    }

    await expect(
      submitMarketingForm(deps, {
        kind: 'feedback',
        fields: { rating: 5, message: 'One too many' },
        ...meta,
      }),
    ).rejects.toBeInstanceOf(TooManySubmissionsError)
  })

  test('still succeeds when the notification fails', async () => {
    const { submissions, deps } = setup()
    deps.notify = vi.fn(async () => {
      throw new Error('resend down')
    })

    await expect(
      submitMarketingForm(deps, {
        kind: 'feedback',
        fields: { rating: 3, message: 'Works' },
        ...meta,
      }),
    ).resolves.toEqual({ ok: true })
    expect(await submissions.list()).toHaveLength(1)
  })
})
