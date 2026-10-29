import { DomainError } from '#/lib/domain-error.ts'
import { resolveImportStateCode } from '#/features/imports/import-state-code.ts'

import type {
  ImportItemRow,
  ImportPartyRow,
  ImportStockRow,
} from '#/features/imports/import-dry-run-service.ts'

export class InvalidTallyExportError extends DomainError {
  constructor() {
    super(
      'This is not a Tally masters export. In Tally, use Export → Masters with format XML.',
    )
    this.name = 'InvalidTallyExportError'
  }
}

export type TallyMasters = {
  parties: Array<ImportPartyRow>
  items: Array<ImportItemRow>
  stock: Array<ImportStockRow>
}

const PARTY_GROUPS = {
  'sundry debtors': 'customer',
  'sundry creditors': 'supplier',
} as const

/** Text of the first descendant with one of these tags that has any. */
function firstText(element: Element, tags: Array<string>): string {
  for (const tag of tags) {
    for (const match of element.getElementsByTagName(tag)) {
      const text = match.textContent.trim()
      if (text) return text
    }
  }
  return ''
}

function nameOf(element: Element): string {
  return (
    element.getAttribute('NAME')?.trim() ||
    firstText(element, ['NAME']) ||
    ''
  )
}

/** Debtor or creditor, following custom groups up to the reserved ones. */
function partyTypeFor(
  parent: string,
  groupParents: Map<string, string>,
): 'customer' | 'supplier' | null {
  let group = parent.toLowerCase()
  for (let depth = 0; depth < 20 && group; depth += 1) {
    if (group in PARTY_GROUPS) {
      return PARTY_GROUPS[group as keyof typeof PARTY_GROUPS]
    }
    group = groupParents.get(group) ?? ''
  }
  return null
}

/** "120 Kg" → "120"; Tally may write a leading minus or thousands commas. */
function quantityOf(text: string): string {
  const match = /-?[\d,]+(\.\d+)?/.exec(text)
  return match ? match[0].replace(/[-,]/g, '') : ''
}

/** "80.00/Kg" → "80.00". */
function amountOf(text: string): string {
  const value = Number.parseFloat(text.replace(/,/g, ''))
  return Number.isFinite(value) ? Math.abs(value).toFixed(2) : ''
}

/** The IGST rate is the full rate; CGST and SGST are each half of it. */
function gstRateOf(item: Element): string {
  for (const detail of item.getElementsByTagName('RATEDETAILS.LIST')) {
    const head = firstText(detail, ['GSTRATEDUTYHEAD']).toLowerCase()
    if (head === 'igst' || head === 'integrated tax') {
      return amountOf(firstText(detail, ['GSTRATE'])) || '0.00'
    }
  }
  return '0.00'
}

/**
 * Parties, stock items and opening stock from a Tally "Export → Masters"
 * XML file. Only debtor and creditor ledgers become parties; other ledgers
 * already exist in the default chart of accounts.
 */
export function parseTallyMasters(
  xml: string,
  defaultStateCode: string,
): TallyMasters {
  // Tally writes control characters such as &#4; before reserved names,
  // which XML 1.0 forbids, so the browser parser would reject the file.
  const cleaned = xml.replace(/&#(x[\da-f]+|\d+);/gi, (entity, code: string) => {
    const value = code.startsWith('x') || code.startsWith('X')
      ? Number.parseInt(code.slice(1), 16)
      : Number(code)
    const allowed = value >= 32 || value === 9 || value === 10 || value === 13
    return allowed ? entity : ''
  })
  const doc = new DOMParser().parseFromString(cleaned, 'text/xml')
  const root = doc.documentElement
  if (
    doc.getElementsByTagName('parsererror').length > 0 ||
    root.tagName !== 'ENVELOPE'
  ) {
    throw new InvalidTallyExportError()
  }

  const groupParents = new Map<string, string>()
  for (const group of root.getElementsByTagName('GROUP')) {
    groupParents.set(
      nameOf(group).toLowerCase(),
      firstText(group, ['PARENT']).toLowerCase(),
    )
  }

  const parties: Array<ImportPartyRow> = []
  for (const ledger of root.getElementsByTagName('LEDGER')) {
    const partyType = partyTypeFor(
      firstText(ledger, ['PARENT']),
      groupParents,
    )
    const name = nameOf(ledger)
    if (!partyType || !name) continue
    const gstin = firstText(ledger, ['GSTIN', 'PARTYGSTIN']).toUpperCase()
    parties.push({
      name,
      partyType,
      gstin: gstin || null,
      stateCode: resolveImportStateCode(
        firstText(ledger, ['LEDSTATENAME', 'STATENAME', 'STATE']),
        gstin,
        defaultStateCode,
      ),
    })
  }

  const items: Array<ImportItemRow> = []
  const stock: Array<ImportStockRow> = []
  for (const element of root.getElementsByTagName('STOCKITEM')) {
    const name = nameOf(element)
    if (!name) continue
    const unit = firstText(element, ['BASEUNITS']) || 'Nos'
    const hsn = firstText(element, ['HSNCODE']).replace(/\s/g, '')
    const gstRate = gstRateOf(element)
    const quantity = quantityOf(firstText(element, ['OPENINGBALANCE']))
    const openingValue = amountOf(firstText(element, ['OPENINGVALUE']))
    let rate = amountOf(firstText(element, ['OPENINGRATE']))
    if (!rate && openingValue && Number(quantity) > 0) {
      rate = (Number(openingValue) / Number(quantity)).toFixed(2)
    }

    items.push({ name, hsn, gstRate, rate: rate || '0.00', unit })
    if (Number(quantity) > 0) {
      stock.push({
        itemName: name,
        quantity,
        unit,
        rate: rate || '0.00',
        hsn,
        gstRate,
      })
    }
  }

  return { parties, items, stock }
}
