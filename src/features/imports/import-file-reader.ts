type SheetCell = string | number | boolean | Date | null | undefined

/** Tally saves XML as UTF-16 by default; everything else is UTF-8. */
export function decodeImportText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes)
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes)
  }
  // UTF-16 without a byte order mark: ASCII "<" followed by a zero byte.
  if (bytes[0] !== 0 && bytes[1] === 0) {
    return new TextDecoder('utf-16le').decode(bytes)
  }
  return new TextDecoder('utf-8').decode(bytes)
}

function csvField(cell: SheetCell): string {
  if (cell === null || cell === undefined) return ''
  const text =
    cell instanceof Date ? cell.toISOString().slice(0, 10) : String(cell)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Spreadsheet rows as CSV, so Excel files go through the CSV import. */
export function sheetRowsToCsv(rows: Array<Array<SheetCell>>): string {
  return rows
    .filter((row) => row.some((cell) => cell !== null && cell !== ''))
    .map((row) => row.map(csvField).join(','))
    .join('\n')
}

/** Import file as text; the first sheet of an Excel workbook becomes CSV. */
export async function readImportFile(file: File): Promise<string> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    return sheetRowsToCsv((await readSheet(file)) as Array<Array<SheetCell>>)
  }
  return decodeImportText(await file.arrayBuffer())
}
