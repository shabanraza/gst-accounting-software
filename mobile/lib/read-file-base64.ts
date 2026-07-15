export async function readFileAsBase64(uri: string): Promise<string> {
  const response = await fetch(uri)
  if (!response.ok) {
    throw new Error('Unable to read captured image')
  }

  const buffer = await response.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }

  if (typeof globalThis.btoa === 'function') {
    return globalThis.btoa(binary)
  }

  throw new Error('Base64 encoding is unavailable in this environment')
}
