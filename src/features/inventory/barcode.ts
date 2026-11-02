/**
 * EAN-13 barcodes for item labels. Shops either keep the manufacturer's
 * EAN-13 / UPC-A, or get an in-store code from the GS1 "20" prefix, which is
 * reserved for restricted (in-store) circulation.
 */

const IN_STORE_PREFIX = '20'

const L_CODES = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
]
const G_CODES = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
]
const R_CODES = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
]
/** Left-half parity, chosen by the first digit. */
const PARITY = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'GLGLGL',
  'GLGGLG',
  'GGLGLL',
]

/** Check digit for the first 12 digits of an EAN-13. */
export function ean13CheckDigit(first12: string): number {
  let sum = 0
  for (let index = 0; index < 12; index++) {
    const digit = Number(first12[index])
    sum += index % 2 === 0 ? digit : digit * 3
  }
  return (10 - (sum % 10)) % 10
}

export function isValidEan13(code: string): boolean {
  return (
    /^\d{13}$/.test(code) &&
    ean13CheckDigit(code.slice(0, 12)) === Number(code[12])
  )
}

/**
 * '' for blank input, the EAN-13 for a valid EAN-13 or UPC-A, and null for
 * anything else.
 */
export function normalizeBarcode(raw: string | undefined): string | null {
  const code = (raw ?? '').replace(/\s+/g, '')
  if (!code) return ''
  const ean = /^\d{12}$/.test(code) ? `0${code}` : code
  return isValidEan13(ean) ? ean : null
}

/** A random in-store EAN-13 that is not in `taken`. */
export function generateInStoreEan13(
  taken: ReadonlySet<string>,
  random: () => number = secureRandom,
): string {
  for (;;) {
    let body = IN_STORE_PREFIX
    while (body.length < 12) body += String(Math.floor(random() * 10) % 10)
    const code = `${body}${ean13CheckDigit(body)}`
    if (!taken.has(code)) return code
  }
}

/** The 95 bar modules of an EAN-13 ('1' = bar, '0' = space). */
export function encodeEan13(code: string): string {
  if (!isValidEan13(code)) {
    throw new Error(`Not a valid EAN-13: ${code}`)
  }
  const digits = [...code].map(Number)
  const parity = PARITY[digits[0]]
  let modules = '101'
  for (let index = 1; index <= 6; index++) {
    const table = parity[index - 1] === 'L' ? L_CODES : G_CODES
    modules += table[digits[index]]
  }
  modules += '01010'
  for (let index = 7; index <= 12; index++) {
    modules += R_CODES[digits[index]]
  }
  return `${modules}101`
}

function secureRandom() {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] / 2 ** 32
}
