import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

const GST_STATE_NAMES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
}

export function formatIndianDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

export function normalizeStateCode(code: string | null | undefined): string {
  return (code ?? '').trim().slice(0, 2)
}

export function stateName(code: string | null | undefined): string {
  const normalized = normalizeStateCode(code)
  return GST_STATE_NAMES[normalized] ?? ''
}

export function stateLabel(code: string | null | undefined): string {
  const normalized = normalizeStateCode(code)
  if (!normalized) return ''
  const name = GST_STATE_NAMES[normalized]
  return name ? `${normalized} - ${name}` : normalized
}

export function isInterStateSupply(
  companyStateCode: string | null | undefined,
  placeOfSupplyCode: string | null | undefined,
): boolean {
  const supplier = normalizeStateCode(companyStateCode)
  const place = normalizeStateCode(placeOfSupplyCode)
  if (!supplier || !place) return false
  return supplier !== place
}

export type GstLineSplit = {
  cgstRate: string
  cgstAmount: string
  sgstRate: string
  sgstAmount: string
  igstRate: string
  igstAmount: string
}

export function splitLineGst(
  input: { gstRate: string; gstAmount: string },
  isInterState: boolean,
): GstLineSplit {
  const gstAmount = new Decimal(input.gstAmount || '0')
  const gstRate = new Decimal(input.gstRate || '0')

  if (isInterState) {
    return {
      cgstRate: '0.00',
      cgstAmount: '0.00',
      sgstRate: '0.00',
      sgstAmount: '0.00',
      igstRate: gstRate.toFixed(2),
      igstAmount: gstAmount.toFixed(2),
    }
  }

  const halfRate = gstRate.dividedBy(2)
  const halfAmount = gstAmount.dividedBy(2)
  return {
    cgstRate: halfRate.toFixed(2),
    cgstAmount: halfAmount.toFixed(2),
    sgstRate: halfRate.toFixed(2),
    sgstAmount: gstAmount.minus(halfAmount).toFixed(2),
    igstRate: '0.00',
    igstAmount: '0.00',
  }
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]
const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
]

function twoDigitsToWords(value: number): string {
  if (value < 20) return ONES[value]
  const tens = Math.floor(value / 10)
  const ones = value % 10
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens]
}

function integerToWords(value: number): string {
  if (value === 0) return 'Zero'

  const crore = Math.floor(value / 10000000)
  const lakh = Math.floor((value % 10000000) / 100000)
  const thousand = Math.floor((value % 100000) / 1000)
  const hundred = Math.floor((value % 1000) / 100)
  const rest = value % 100

  const parts: Array<string> = []
  if (crore) parts.push(`${integerToWords(crore)} Crore`)
  if (lakh) parts.push(`${twoDigitsToWords(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigitsToWords(thousand)} Thousand`)
  if (hundred) parts.push(`${ONES[hundred]} Hundred`)
  if (rest) parts.push(twoDigitsToWords(rest))

  return parts.join(' ')
}

export function amountInWords(amount: string | number): string {
  const value = new Decimal(amount || '0')
  const rupees = value.floor()
  const paise = value.minus(rupees).times(100).round().toNumber()

  const rupeeWords = integerToWords(rupees.toNumber())
  let result = `${rupeeWords} Rupees`
  if (paise > 0) {
    result += ` and ${twoDigitsToWords(paise)} Paise`
  }
  return `${result} Only`
}
