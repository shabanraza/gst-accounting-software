function tryNativeUuid(): string | null {
  try {
    const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } })
      .crypto
    if (typeof cryptoRef?.randomUUID === 'function') {
      return cryptoRef.randomUUID()
    }
  } catch {
    // Hermes throws when `crypto` is not defined on globalThis.
  }

  return null
}

/** Cross-platform id for form line keys (Hermes/Android has no global crypto). */
export function randomId(): string {
  const nativeId = tryNativeUuid()
  if (nativeId) {
    return nativeId
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}
