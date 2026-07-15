import { describe, expect, it, vi } from 'vitest'

import { readFileAsBase64 } from './read-file-base64.ts'

describe('readFileAsBase64', () => {
  it('encodes fetched file bytes as base64', async () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111])
    const btoa = vi.fn((value: string) => `encoded:${value}`)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => bytes.buffer,
      })),
    )
    vi.stubGlobal('btoa', btoa)

    await expect(readFileAsBase64('file:///hello.txt')).resolves.toBe(
      'encoded:Hello',
    )
  })
})
