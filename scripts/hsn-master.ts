/**
 * Turns the GST portal's HSN/SAC master (sheets HSN_MSTR and SAC_MSTR) into
 * one compact JSON file per HSN chapter, with SAC codes in chapter 99.
 * Each file is an array of [code, description] rows sorted by code.
 */

export type HsnDataRow = [code: string, description: string]

export type DroppedCode = { sheet: string; code: string; description: string; reason: string }

export type HsnDataBuild = {
  files: Record<string, Array<HsnDataRow>>
  dropped: Array<DroppedCode>
  duplicates: Array<string>
}

type SheetRow = ReadonlyArray<unknown>

const VALID_LENGTHS = new Set([2, 4, 6, 8])

export function normalizeCode(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  const code = String(raw).replace(/\s+/g, '')
  if (!/^\d+$/.test(code) || !VALID_LENGTHS.has(code.length)) return null
  return code
}

/**
 * Whitespace cleanup plus the tilde some rows use between path levels; the
 * official wording, spelling and casing stay.
 */
export function cleanDescription(raw: unknown): string {
  return String(raw ?? '')
    .replace(/_x000D_/g, ' ')
    .replace(/\s*~\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * The source file holds some chapter 01-09 subheadings stored as numbers, so
 * their leading zero is gone and a 5- or 7-digit code reads as a 4- or 6-digit
 * code of chapter 10-98 (for example "3011 Ornamental fish" under chapter 30).
 * Such a code has no 8-digit tariff items under it, while the heading it came
 * from ("0301") does. Headings with nothing under them (deleted headings and
 * test rows) are dropped too.
 */
function dropMisplacedHsnCodes(byCode: Map<string, string>, dropped: Array<DroppedCode>) {
  const codes = [...byCode.keys()].sort()
  const withItems = new Set<string>()
  const withChildren = new Set<string>()
  for (const code of codes) {
    if (code.length === 8) {
      withItems.add(code.slice(0, 4))
      withItems.add(code.slice(0, 6))
    }
    if (code.length > 4) withChildren.add(code.slice(0, 4))
  }

  for (const code of codes) {
    if (code.length !== 4 && code.length !== 6) continue
    const description = byCode.get(code) ?? ''
    const original = `0${code.slice(0, 3)}`
    let reason: string | null = null
    if (!code.startsWith('0') && !withItems.has(code) && withItems.has(original)) {
      reason = `leading zero lost (belongs under ${original})`
    } else if (code.length === 4 && !withChildren.has(code)) {
      reason = 'heading with no codes under it'
    }
    if (reason) {
      byCode.delete(code)
      dropped.push({ sheet: 'HSN_MSTR', code, description, reason })
    }
  }
}

export function buildHsnDataFiles(
  hsnRows: ReadonlyArray<SheetRow>,
  sacRows: ReadonlyArray<SheetRow>,
): HsnDataBuild {
  const byCode = new Map<string, string>()
  const dropped: Array<DroppedCode> = []
  const duplicates: Array<string> = []

  const add = (sheet: string, rows: ReadonlyArray<SheetRow>) => {
    for (const row of rows.slice(1)) {
      const description = cleanDescription(row[1])
      const code = normalizeCode(row[0])
      if (!code) {
        if (row[0] !== null && row[0] !== undefined && String(row[0]).trim() !== '') {
          dropped.push({ sheet, code: String(row[0]).trim(), description, reason: 'not 2, 4, 6 or 8 digits' })
        }
        continue
      }
      if (byCode.has(code)) {
        duplicates.push(code)
        continue
      }
      byCode.set(code, description)
    }
  }

  add('HSN_MSTR', hsnRows)
  dropMisplacedHsnCodes(byCode, dropped)
  add('SAC_MSTR', sacRows)

  const files: Record<string, Array<HsnDataRow>> = {}
  for (const [code, description] of [...byCode.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const chapter = code.slice(0, 2)
    ;(files[chapter] ??= []).push([code, description])
  }

  return { files, dropped, duplicates }
}
