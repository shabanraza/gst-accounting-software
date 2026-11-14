import { describe, expect, test } from 'vitest'

import {
  SHARE_TOKEN_TTL_SECONDS,
  ShareSecretMissingError,
  shareTokenExpiry,
  signShareToken,
  verifyShareToken,
} from '#/features/documents/invoice-share-token.ts'

const secret = 'test-secret-that-is-at-least-32-characters-long'
const companyId = '6f1c2b8e-4c57-4a1e-9a43-0d6f3f7b2a10'
const invoiceId = '0b5e8d4a-91f2-4c3b-8e7d-2a6c9f1e5b33'
const now = new Date('2026-11-14T10:00:00Z')
const later = new Date('2026-12-14T10:00:00Z')

function flipChar(token: string, index: number) {
  const chars = token.split('')
  chars[index] = chars[index] === 'A' ? 'B' : 'A'
  return chars.join('')
}

describe('invoice share token', () => {
  test('round-trips the company and invoice it was signed for', async () => {
    const token = await signShareToken(
      { companyId, invoiceId, expiresAt: later },
      secret,
    )

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(token.length).toBeLessThan(100)
    await expect(verifyShareToken(token, secret, now)).resolves.toEqual({
      companyId,
      invoiceId,
    })
  })

  test('does not contain the ids in readable form', async () => {
    const token = await signShareToken(
      { companyId, invoiceId, expiresAt: later },
      secret,
    )
    expect(token).not.toContain(companyId)
    expect(token).not.toContain(invoiceId)
  })

  test('rejects a token signed with another secret', async () => {
    const token = await signShareToken(
      { companyId, invoiceId, expiresAt: later },
      'another-secret-that-is-also-32-characters-long',
    )
    await expect(verifyShareToken(token, secret, now)).resolves.toBeNull()
  })

  test('rejects a tampered payload or signature', async () => {
    const token = await signShareToken(
      { companyId, invoiceId, expiresAt: later },
      secret,
    )
    for (const index of [2, 10, 30, 49, 60, token.length - 2]) {
      await expect(
        verifyShareToken(flipChar(token, index), secret, now),
      ).resolves.toBeNull()
    }
  })

  test('rejects a token re-pointed at another invoice', async () => {
    const other = await signShareToken(
      {
        companyId,
        invoiceId: 'a3d1e7c2-5b84-4f69-b0a2-7c3e9d18f4e6',
        expiresAt: later,
      },
      secret,
    )
    const token = await signShareToken(
      { companyId, invoiceId, expiresAt: later },
      secret,
    )
    // Swap the invoice bytes of one token with another's signature.
    const spliced = token.slice(0, 40) + other.slice(40)
    await expect(verifyShareToken(spliced, secret, now)).resolves.toBeNull()
    await expect(verifyShareToken(other, secret, now)).resolves.toEqual({
      companyId,
      invoiceId: 'a3d1e7c2-5b84-4f69-b0a2-7c3e9d18f4e6',
    })
  })

  test('rejects an expired token', async () => {
    const token = await signShareToken(
      { companyId, invoiceId, expiresAt: later },
      secret,
    )
    await expect(
      verifyShareToken(token, secret, new Date('2026-12-14T10:00:01Z')),
    ).resolves.toBeNull()
  })

  test.each(['', 'abc', 'a'.repeat(92), `${'A'.repeat(91)}=`, '../../etc'])(
    'rejects malformed input %j',
    async (token) => {
      await expect(verifyShareToken(token, secret, now)).resolves.toBeNull()
    },
  )

  test('refuses to sign without a strong secret and never verifies with one', async () => {
    await expect(
      signShareToken({ companyId, invoiceId, expiresAt: later }, undefined),
    ).rejects.toBeInstanceOf(ShareSecretMissingError)
    await expect(
      signShareToken({ companyId, invoiceId, expiresAt: later }, 'short'),
    ).rejects.toBeInstanceOf(ShareSecretMissingError)

    const token = await signShareToken(
      { companyId, invoiceId, expiresAt: later },
      secret,
    )
    await expect(verifyShareToken(token, undefined, now)).resolves.toBeNull()
    await expect(verifyShareToken(token, '', now)).resolves.toBeNull()
  })

  test('rejects ids that are not UUIDs', async () => {
    await expect(
      signShareToken(
        { companyId: 'company-1', invoiceId, expiresAt: later },
        secret,
      ),
    ).rejects.toThrow()
  })

  test('defaults to a 90 day expiry', () => {
    expect(SHARE_TOKEN_TTL_SECONDS).toBe(90 * 24 * 60 * 60)
    expect(shareTokenExpiry(now).toISOString()).toBe('2027-02-12T10:00:00.000Z')
  })
})
