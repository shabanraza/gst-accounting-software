import { describe, expect, test } from 'vitest'

import {
  buildChapterTree,
  createHsnCodeIndex,
  displayDescription,
  searchHsnCodes,
} from '#/features/tools/hsn-codes.ts'
import type { HsnCodeRow } from '#/features/tools/hsn-codes.ts'
import { loadAllHsnRows, loadChapterRows } from '#/features/tools/hsn-data-loader.ts'

const ROWS: Array<HsnCodeRow> = [
  ['85', 'ELECTRICAL MACHINERY AND EQUIPMENT'],
  ['8517', 'TELEPHONE SETS, INCLUDING SMARTPHONES AND OTHER TELEPHONES FOR CELLULAR NETWORKS'],
  ['851713', 'SMARTPHONES'],
  ['85171300', 'SMARTPHONES'],
  ['851718', 'OTHER:'],
  ['85171810', 'PUSH BUTTON TYPE'],
  ['85171890', 'OTHER'],
  ['8528', 'MONITORS AND PROJECTORS; TELEVISION RECEPTION APPARATUS'],
  ['85287211', 'COLOUR TELEVISION SETS'],
  ['85287299', '-'],
]

describe('createHsnCodeIndex', () => {
  test('gives each code its parent headings as context', () => {
    const index = createHsnCodeIndex(ROWS)
    const other = index.byCode.get('85171890')
    expect(other?.context.map((parent) => parent.code)).toEqual(['8517', '851718'])
  })
})

describe('displayDescription', () => {
  test('names a bare "Other" or blank row after its nearest parent', () => {
    const index = createHsnCodeIndex(ROWS)
    expect(displayDescription(index.byCode.get('85171890')!)).toBe('OTHER')
    expect(displayDescription(index.byCode.get('85287299')!)).toBe('MONITORS AND PROJECTORS; TELEVISION RECEPTION APPARATUS')
  })
})

describe('searchHsnCodes on sample rows', () => {
  const index = createHsnCodeIndex(ROWS)

  test('finds the tariff item and hides a sub-heading with the same wording', () => {
    const codes = searchHsnCodes(index, 'smartphone').matches.map((match) => match.code)
    expect(codes[0]).toBe('85171300')
    expect(codes).not.toContain('851713')
    expect(codes).toContain('8517')
  })

  test('lists a heading and everything under it for a code prefix', () => {
    const { matches, total } = searchHsnCodes(index, '8517')
    expect(matches.map((match) => match.code)).toEqual(['8517', '851713', '85171300', '851718', '85171810', '85171890'])
    expect(total).toBe(6)
  })

  test('accepts codes typed with spaces or dots', () => {
    expect(searchHsnCodes(index, '8517 13 00').matches[0]?.code).toBe('85171300')
    expect(searchHsnCodes(index, '8517.13').matches[0]?.code).toBe('851713')
  })

  test('falls back to the nearest parent for an unknown code', () => {
    expect(searchHsnCodes(index, '85171999').matches.map((match) => match.code)).toEqual(['8517'])
  })

  test('lists the headings of a chapter for two digits', () => {
    expect(searchHsnCodes(index, '85').matches.map((match) => match.code)).toEqual(['8517', '8528'])
  })

  test('caps the matches and reports the total', () => {
    const { matches, total } = searchHsnCodes(index, '85', { limit: 1 })
    expect(matches).toHaveLength(1)
    expect(total).toBe(2)
  })

  test('matches plural and singular forms', () => {
    expect(searchHsnCodes(index, 'television sets').matches[0]?.code).toBe('85287211')
  })

  test('returns nothing for blank input or no match', () => {
    expect(searchHsnCodes(index, '   ')).toEqual({ matches: [], total: 0 })
    expect(searchHsnCodes(index, 'zzzz').total).toBe(0)
  })
})

describe('searchHsnCodes on the GST portal master', async () => {
  const index = createHsnCodeIndex(await loadAllHsnRows())
  const top = (query: string, count = 10) =>
    searchHsnCodes(index, query).matches.slice(0, count).map((match) => match.code)

  test('has the whole master loaded', () => {
    expect(index.rows.length).toBeGreaterThan(22000)
  })

  test('smartphone finds 85171300', () => {
    expect(top('smartphone', 3)).toContain('85171300')
  })

  test('mobile phone finds telephone codes in heading 8517', () => {
    expect(top('mobile phone', 5).some((code) => code.startsWith('8517'))).toBe(true)
  })

  test('cotton fabric finds chapter 52 items', () => {
    expect(top('cotton fabric', 5).filter((code) => code.startsWith('52')).length).toBeGreaterThan(2)
  })

  test('saree finds saree tariff items', () => {
    const codes = top('saree')
    expect(codes).toContain('50072010')
    expect(codes.some((code) => code.startsWith('52'))).toBe(true)
  })

  test('medicine finds medicaments in chapter 30', () => {
    expect(top('medicine', 5).filter((code) => code.startsWith('30')).length).toBeGreaterThan(2)
  })

  test('restaurant finds the SAC code for restaurant services', () => {
    expect(top('restaurant', 5)).toContain('996331')
  })

  test('smartphone ranks heading 8517 above bare "Other" rows under it', () => {
    const codes = top('smartphone', 3)
    expect(codes).toContain('8517')
  })

  test('8517 lists the heading first', () => {
    expect(top('8517', 1)).toEqual(['8517'])
  })
})

describe('buildChapterTree', () => {
  test('groups codes under their four-digit headings', () => {
    const tree = buildChapterTree(ROWS)
    expect(tree.chapter?.code).toBe('85')
    expect(tree.headings.map((heading) => heading.code)).toEqual(['8517', '8528'])
    expect(tree.headings[0]?.items.map((item) => item.code)).toEqual([
      '851713',
      '85171300',
      '851718',
      '85171810',
      '85171890',
    ])
    expect(tree.headings[0]?.items[1]?.depth).toBe(2)
    expect(tree.headings[0]?.items[0]?.depth).toBe(1)
  })

  test('keeps codes without a heading in the file', () => {
    const tree = buildChapterTree([['98', 'PROJECT IMPORTS'], ['98071000', 'ACTIONABLE CLAIM']])
    expect(tree.headings).toEqual([])
    expect(tree.loose.map((item) => item.code)).toEqual(['98071000'])
  })

  test('loads a real chapter file', async () => {
    const tree = buildChapterTree(await loadChapterRows('99'))
    expect(tree.headings.some((heading) => heading.code === '9963')).toBe(true)
  })
})
