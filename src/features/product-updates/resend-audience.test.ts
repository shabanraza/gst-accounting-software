import { describe, expect, test, vi } from 'vitest'

import { createResendAudience } from '#/features/product-updates/resend-audience.ts'

function fakeFetch(responses: Array<Response>) {
  return vi.fn(async (_url: string, _init?: RequestInit) => {
    const next = responses.shift()
    if (!next) throw new Error('unexpected request')
    return next
  })
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status })

function calls(fetch: ReturnType<typeof fakeFetch>) {
  return fetch.mock.calls.map(([url, init]) => ({
    url,
    method: init?.method ?? 'GET',
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  }))
}

const config = { apiKey: 're_test', audienceId: 'seg_1' }

describe('createResendAudience', () => {
  test('is disabled without an audience id or API key', () => {
    expect(createResendAudience({ apiKey: 're_test', audienceId: '' })).toBeNull()
    expect(createResendAudience({ apiKey: undefined, audienceId: 'seg_1' })).toBeNull()
  })

  test('subscribing a new contact creates it inside the audience', async () => {
    const fetch = fakeFetch([json({ message: 'not found' }, 404), json({ id: 'c1' })])
    const audience = createResendAudience({ ...config, fetch })!

    await audience.subscribe({ email: 'asha+x@example.com', name: 'Asha' })

    expect(calls(fetch)).toEqual([
      {
        url: 'https://api.resend.com/contacts/asha%2Bx%40example.com',
        method: 'PATCH',
        body: { unsubscribed: false },
      },
      {
        url: 'https://api.resend.com/contacts',
        method: 'POST',
        body: {
          email: 'asha+x@example.com',
          first_name: 'Asha',
          unsubscribed: false,
          segments: [{ id: 'seg_1' }],
        },
      },
    ])
    expect(fetch.mock.calls[0][1]?.headers).toMatchObject({
      Authorization: 'Bearer re_test',
    })
  })

  test('subscribing an existing contact resubscribes it and adds it to the audience', async () => {
    const fetch = fakeFetch([json({ id: 'c1' }), json({ id: 'seg_1' })])
    const audience = createResendAudience({ ...config, fetch })!

    await audience.subscribe({ email: 'asha@example.com', name: 'Asha' })

    expect(calls(fetch)).toEqual([
      {
        url: 'https://api.resend.com/contacts/asha%40example.com',
        method: 'PATCH',
        body: { unsubscribed: false },
      },
      {
        url: 'https://api.resend.com/contacts/asha%40example.com/segments/seg_1',
        method: 'POST',
        body: undefined,
      },
    ])
  })

  test('unsubscribing marks the contact unsubscribed and tolerates a missing contact', async () => {
    const fetch = fakeFetch([json({ id: 'c1' }), json({}, 404)])
    const audience = createResendAudience({ ...config, fetch })!

    await audience.unsubscribe('asha@example.com')
    await audience.unsubscribe('gone@example.com')

    expect(calls(fetch)[0]).toEqual({
      url: 'https://api.resend.com/contacts/asha%40example.com',
      method: 'PATCH',
      body: { unsubscribed: true },
    })
  })

  test('reads whether a contact is still subscribed', async () => {
    const fetch = fakeFetch([
      json({ email: 'a@example.com', unsubscribed: false }),
      json({ email: 'a@example.com', unsubscribed: true }),
      json({}, 404),
    ])
    const audience = createResendAudience({ ...config, fetch })!

    await expect(audience.isSubscribed('a@example.com')).resolves.toBe(true)
    await expect(audience.isSubscribed('a@example.com')).resolves.toBe(false)
    await expect(audience.isSubscribed('a@example.com')).resolves.toBe(false)
  })

  test('throws on other Resend errors', async () => {
    const fetch = fakeFetch([json({ message: 'boom' }, 500)])
    const audience = createResendAudience({ ...config, fetch })!

    await expect(audience.unsubscribe('a@example.com')).rejects.toThrow('500')
  })
})
