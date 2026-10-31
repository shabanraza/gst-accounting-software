import { describe, expect, test } from 'vitest'

import {
  decodeImportText,
  sheetRowsToCsv,
} from '#/features/imports/import-file-reader.ts'

function utf16le(text: string, bom = true): ArrayBuffer {
  const bytes = new Uint8Array((text.length + (bom ? 1 : 0)) * 2)
  const view = new DataView(bytes.buffer)
  let offset = 0
  if (bom) {
    view.setUint16(0, 0xfeff, true)
    offset = 2
  }
  for (const [index, char] of [...text].entries()) {
    view.setUint16(offset + index * 2, char.charCodeAt(0), true)
  }
  return bytes.buffer
}

describe('decodeImportText', () => {
  test('reads the UTF-16 files Tally writes by default', () => {
    expect(decodeImportText(utf16le('<ENVELOPE/>'))).toBe('<ENVELOPE/>')
  })

  test('reads UTF-8 with or without a byte order mark', () => {
    const plain = new TextEncoder().encode('name,gstin').buffer
    const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('₹ rate')]).buffer
    expect(decodeImportText(plain)).toBe('name,gstin')
    expect(decodeImportText(withBom)).toBe('₹ rate')
  })
})

describe('sheetRowsToCsv', () => {
  test('turns spreadsheet rows into CSV the import already understands', () => {
    expect(
      sheetRowsToCsv([
        ['Item Name', 'HSN/SAC', 'Sale Rate', 'Opening Date'],
        ['Yarn, cotton', 52051200, 120.5, new Date('2026-04-01T00:00:00Z')],
        ['Say "hi"', null, 0, null],
      ]),
    ).toBe(
      [
        'Item Name,HSN/SAC,Sale Rate,Opening Date',
        '"Yarn, cotton",52051200,120.5,2026-04-01',
        '"Say ""hi""",,0,',
      ].join('\n'),
    )
  })

  test('drops empty rows', () => {
    expect(sheetRowsToCsv([['Name'], [null], ['A']])).toBe('Name\nA')
  })
})

describe('decodeImportText without a byte order mark', () => {
  test('recognises UTF-16 from its zero bytes', () => {
    expect(decodeImportText(utf16le('<ENVELOPE/>', false))).toBe('<ENVELOPE/>')
  })
})
