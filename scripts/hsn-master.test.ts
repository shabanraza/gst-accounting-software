import { describe, expect, test } from 'vitest'

import { buildHsnDataFiles, cleanDescription, normalizeCode } from './hsn-master.ts'

describe('normalizeCode', () => {
  test('keeps 2, 4, 6 and 8 digit codes and removes spaces', () => {
    expect(normalizeCode('85171300')).toBe('85171300')
    expect(normalizeCode('2307 00')).toBe('230700')
    expect(normalizeCode(9954)).toBe('9954')
  })

  test('rejects codes that are not 2, 4, 6 or 8 digits', () => {
    expect(normalizeCode('30559')).toBeNull()
    expect(normalizeCode('3074330')).toBeNull()
    expect(normalizeCode('85A7')).toBeNull()
    expect(normalizeCode('')).toBeNull()
    expect(normalizeCode(undefined)).toBeNull()
  })
})

describe('cleanDescription', () => {
  test('removes spreadsheet line-break artefacts and repeated whitespace', () => {
    expect(cleanDescription('EDIBLE PRODUCTS _x000D_\r\nOF ANIMAL   ORIGIN ')).toBe(
      'EDIBLE PRODUCTS OF ANIMAL ORIGIN',
    )
  })

  test('turns the tilde path separator into a readable dash', () => {
    expect(cleanDescription('RESIDUES AND WASTE~Wine lees; argol')).toBe('RESIDUES AND WASTE - Wine lees; argol')
    expect(cleanDescription('NOT INCLUDED~ Milk')).toBe('NOT INCLUDED - Milk')
  })

  test('keeps the official wording and casing', () => {
    expect(cleanDescription('Mobils phone, other than push button type')).toBe(
      'Mobils phone, other than push button type',
    )
  })
})

describe('buildHsnDataFiles', () => {
  const hsnRows = [
    ['HSN_CD', 'HSN_Description'],
    ['85', 'ELECTRICAL MACHINERY'],
    ['8517', 'TELEPHONE SETS'],
    ['851713', 'SMARTPHONES'],
    ['85171300', 'SMARTPHONES'],
    ['85171300', 'SMARTPHONES DUPLICATE'],
    ['01', 'LIVE ANIMALS'],
    ['0101', 'LIVE HORSES'],
    ['01011010', 'HORSES FOR BREEDING'],
    ['30559', 'BROKEN CODE'],
    ['2307 00', 'WINE LEES'],
    // Chapter 03 subheadings that lost their leading zero and now look like
    // chapter 30 codes.
    ['03', 'FISH'],
    ['0303', 'FISH, FROZEN'],
    ['03037900', 'OTHER FROZEN FISH'],
    ['30', 'PHARMACEUTICAL PRODUCTS'],
    ['3004', 'MEDICAMENTS'],
    ['30049011', 'AYURVEDIC MEDICAMENTS'],
    ['3037', 'Other fish'],
    ['303799', 'Other'],
    // A heading with nothing under it.
    ['1111', 'AKASH test'],
    // A real heading that also shares digits with 0401 keeps its place.
    ['04', 'DAIRY'],
    ['0401', 'MILK'],
    ['04011000', 'MILK, NOT CONCENTRATED'],
    ['40', 'RUBBER'],
    ['4011', 'NEW PNEUMATIC TYRES'],
    ['40111010', 'RADIAL CAR TYRES'],
  ]
  const sacRows = [
    ['SAC_CD', 'SAC_Description'],
    [99, 'All Services'],
    [9963, 'Accommodation, food and beverage services'],
    [996331, 'Services provided by restaurants'],
  ]

  const result = buildHsnDataFiles(hsnRows, sacRows)

  test('splits goods into one file per chapter, sorted by code', () => {
    expect(Object.keys(result.files).sort()).toEqual(['01', '03', '04', '23', '30', '40', '85', '99'])
    expect(result.files['85']).toEqual([
      ['85', 'ELECTRICAL MACHINERY'],
      ['8517', 'TELEPHONE SETS'],
      ['851713', 'SMARTPHONES'],
      ['85171300', 'SMARTPHONES'],
    ])
    expect(result.files['23']).toEqual([['230700', 'WINE LEES']])
  })

  test('puts SAC codes in the chapter 99 file', () => {
    expect(result.files['99']).toEqual([
      ['99', 'All Services'],
      ['9963', 'Accommodation, food and beverage services'],
      ['996331', 'Services provided by restaurants'],
    ])
  })

  test('keeps codes whose heading is missing from the file under their chapter', () => {
    expect(result.files['23']).toEqual([['230700', 'WINE LEES']])
  })

  test('drops codes that lost a leading zero and headings with nothing under them', () => {
    expect(result.files['30']).toEqual([
      ['30', 'PHARMACEUTICAL PRODUCTS'],
      ['3004', 'MEDICAMENTS'],
      ['30049011', 'AYURVEDIC MEDICAMENTS'],
    ])
    expect(result.files['40'].map(([code]) => code)).toEqual(['40', '4011', '40111010'])
  })

  test('reports dropped and duplicate codes with the reason', () => {
    expect(result.dropped).toEqual([
      { sheet: 'HSN_MSTR', code: '30559', description: 'BROKEN CODE', reason: 'not 2, 4, 6 or 8 digits' },
      { sheet: 'HSN_MSTR', code: '1111', description: 'AKASH test', reason: 'heading with no codes under it' },
      { sheet: 'HSN_MSTR', code: '3037', description: 'Other fish', reason: 'leading zero lost (belongs under 0303)' },
      { sheet: 'HSN_MSTR', code: '303799', description: 'Other', reason: 'leading zero lost (belongs under 0303)' },
    ])
    expect(result.duplicates).toEqual(['85171300'])
  })
})
