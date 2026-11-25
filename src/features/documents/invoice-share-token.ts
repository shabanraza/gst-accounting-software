/**
 * Signed, stateless tokens for the public invoice link (`/i/<token>`).
 *
 * Layout (69 bytes, base64url → 92 chars):
 *   version (1) | companyId (16) | invoiceId (16) | expiry, unix seconds (4) | HMAC-SHA256 (32)
 *
 * The HMAC covers every byte before it and is keyed with
 * `INVOICE_LINK_SECRET`, so a token cannot be forged or re-pointed at another
 * invoice without the secret. Uses WebCrypto, which runs on Cloudflare Workers.
 */

const TOKEN_VERSION = 1
const UUID_BYTES = 16
const PAYLOAD_BYTES = 1 + UUID_BYTES * 2 + 4
const MAC_BYTES = 32
const TOKEN_BYTES = PAYLOAD_BYTES + MAC_BYTES
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{92}$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MIN_SECRET_LENGTH = 32

export const SHARE_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60

export class ShareSecretMissingError extends Error {
  constructor() {
    super('INVOICE_LINK_SECRET is not set (needs at least 32 characters)')
    this.name = 'ShareSecretMissingError'
  }
}

export type ShareTokenClaims = {
  companyId: string
  invoiceId: string
}

export function shareTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + SHARE_TOKEN_TTL_SECONDS * 1000)
}

function isUsableSecret(secret: string | undefined): secret is string {
  return typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH
}

function uuidToBytes(uuid: string): Uint8Array {
  if (!UUID_PATTERN.test(uuid)) {
    throw new Error('Share tokens can only be issued for UUID ids')
  }
  const hex = uuid.replaceAll('-', '')
  const bytes = new Uint8Array(UUID_BYTES)
  for (let index = 0; index < UUID_BYTES; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '')
}

function fromBase64Url(value: string): Uint8Array {
  const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function hmac(secret: string, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data))
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index]
  }
  return diff === 0
}

export async function signShareToken(
  claims: ShareTokenClaims & { expiresAt: Date },
  secret: string | undefined,
): Promise<string> {
  if (!isUsableSecret(secret)) throw new ShareSecretMissingError()

  const payload = new Uint8Array(PAYLOAD_BYTES)
  payload[0] = TOKEN_VERSION
  payload.set(uuidToBytes(claims.companyId), 1)
  payload.set(uuidToBytes(claims.invoiceId), 1 + UUID_BYTES)
  new DataView(payload.buffer).setUint32(
    1 + UUID_BYTES * 2,
    Math.floor(claims.expiresAt.getTime() / 1000),
  )

  const token = new Uint8Array(TOKEN_BYTES)
  token.set(payload, 0)
  token.set(await hmac(secret, payload), PAYLOAD_BYTES)
  return toBase64Url(token)
}

/** Returns the claims of a valid, unexpired token, or null for anything else. */
export async function verifyShareToken(
  token: string,
  secret: string | undefined,
  now: Date = new Date(),
): Promise<ShareTokenClaims | null> {
  if (!isUsableSecret(secret) || !TOKEN_PATTERN.test(token)) return null

  let bytes: Uint8Array
  try {
    bytes = fromBase64Url(token)
  } catch {
    return null
  }
  if (bytes.length !== TOKEN_BYTES) return null

  const payload = bytes.slice(0, PAYLOAD_BYTES)
  const mac = bytes.slice(PAYLOAD_BYTES)
  if (!constantTimeEqual(mac, await hmac(secret, payload))) return null
  if (payload[0] !== TOKEN_VERSION) return null

  const expiresAt = new DataView(payload.buffer).getUint32(1 + UUID_BYTES * 2)
  if (now.getTime() / 1000 >= expiresAt) return null

  return {
    companyId: bytesToUuid(payload.slice(1, 1 + UUID_BYTES)),
    invoiceId: bytesToUuid(payload.slice(1 + UUID_BYTES, 1 + UUID_BYTES * 2)),
  }
}
