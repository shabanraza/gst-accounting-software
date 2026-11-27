/**
 * Code-level HSN and SAC lookup over the GST portal's HSN/SAC master
 * (generated into ./hsn-data by scripts/build-hsn-data.ts). Descriptions are
 * the official wording; the master carries no GST rates.
 */
import { HSN_CHAPTERS } from '#/features/tools/hsn-service.ts'

export type HsnCodeRow = readonly [code: string, description: string]

export type HsnParent = { code: string; description: string }

export type HsnCode = {
  code: string
  description: string
  /** Four- and six-digit parents present in the master, outermost first. */
  context: ReadonlyArray<HsnParent>
}

type IndexedCode = HsnCode & { text: string; contextText: string; generic: boolean }

export type HsnCodeIndex = {
  rows: ReadonlyArray<IndexedCode>
  byCode: ReadonlyMap<string, IndexedCode>
}

export type HsnSearchResult = { matches: Array<HsnCode>; total: number }

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** "Other", "Others:" or a blank/dash description says nothing on its own. */
function isGeneric(description: string): boolean {
  const words = normalize(description)
  return words === '' || words === 'other' || words === 'others'
}

export function createHsnCodeIndex(rows: ReadonlyArray<HsnCodeRow>): HsnCodeIndex {
  const descriptions = new Map(rows.map(([code, description]) => [code, description]))
  const indexed: Array<IndexedCode> = []
  const byCode = new Map<string, IndexedCode>()

  for (const [code, description] of rows) {
    const context: Array<HsnParent> = []
    for (const length of [4, 6]) {
      if (code.length <= length) break
      const parent = descriptions.get(code.slice(0, length))
      if (parent !== undefined) context.push({ code: code.slice(0, length), description: parent })
    }
    const generic = isGeneric(description)
    const entry: IndexedCode = {
      code,
      description,
      context,
      generic,
      text: generic ? '' : ` ${normalize(description)} `,
      contextText: ` ${normalize(context.map((parent) => parent.description).join(' '))} `,
    }
    indexed.push(entry)
    byCode.set(code, entry)
  }

  indexed.sort((a, b) => (a.code < b.code ? -1 : 1))
  return { rows: indexed, byCode }
}

/** The official text, or the nearest parent's when the row is blank. */
export function displayDescription(entry: HsnCode): string {
  if (normalize(entry.description) !== '') return entry.description
  return entry.context.at(-1)?.description ?? entry.description
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'or', 'of', 'the', 'for', 'in', 'on', 'to', 'by', 'with', 'other', 'others', 'hsn', 'sac', 'code', 'gst',
])

/** Everyday words and the tariff wording for them. */
const SYNONYMS: Partial<Record<string, ReadonlyArray<string>>> = {
  medicine: ['medicine', 'medicament'],
  mobile: ['mobile', 'cellular', 'smartphone'],
  saree: ['saree', 'sari', 'saari'],
  sari: ['sari', 'saree', 'saari'],
  laptop: ['laptop', 'portable automatic data processing'],
  computer: ['computer', 'automatic data processing'],
  tv: ['television'],
  fridge: ['refrigerator'],
  ac: ['air conditioning'],
  bike: ['motorcycle', 'bicycle'],
}

function singular(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (/(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

type Term = ReadonlyArray<string>

function queryTerms(query: string): Array<Term> {
  const words = normalize(query).split(' ').filter(Boolean)
  const meaningful = words.filter((word) => !STOPWORDS.has(word))
  return (meaningful.length > 0 ? meaningful : words).map((word) => {
    const base = singular(word)
    return SYNONYMS[base] ?? SYNONYMS[word] ?? [base]
  })
}

function termScore(text: string, variants: Term, weights: readonly [number, number, number]): number {
  let best = 0
  for (const variant of variants) {
    if (text.includes(` ${variant} `) || text.includes(` ${variant}s `)) return weights[0]
    if (text.includes(` ${variant}`)) best = Math.max(best, weights[1])
    else if (variant.length >= 4 && text.includes(variant)) best = Math.max(best, weights[2])
  }
  return best
}

const OWN_WEIGHTS = [6, 4, 2] as const
const CONTEXT_WEIGHTS = [1, 0.75, 0.5] as const

function toResult(entry: IndexedCode): HsnCode {
  return { code: entry.code, description: entry.description, context: entry.context }
}

function searchByCode(index: HsnCodeIndex, digits: string): Array<IndexedCode> {
  if (digits.length === 2) {
    return index.rows.filter((entry) => entry.code.length === 4 && entry.code.startsWith(digits))
  }
  const matches = index.rows.filter((entry) => entry.code.length > 2 && entry.code.startsWith(digits))
  if (matches.length > 0) return matches
  const parents: Array<IndexedCode> = []
  for (const length of [6, 4]) {
    const parent = index.byCode.get(digits.slice(0, length))
    if (parent && digits.length > length) parents.push(parent)
  }
  return parents.slice(0, 1)
}

const CHAPTER_TEXT = new Map(
  HSN_CHAPTERS.map((chapter) => [chapter.code, ` ${normalize(`${chapter.title} ${chapter.keywords.join(' ')}`)} `]),
)

/** Chapters whose title or everyday keywords match the query rank first. */
function chapterAffinity(terms: ReadonlyArray<Term>): Map<string, number> {
  const affinity = new Map<string, number>()
  for (const [code, text] of CHAPTER_TEXT) {
    const score = terms.reduce((sum, term) => sum + (termScore(text, term, [2.5, 2, 0]) > 0 ? 2.5 : 0), 0)
    if (score > 0) affinity.set(code, score)
  }
  return affinity
}

function searchByText(index: HsnCodeIndex, terms: ReadonlyArray<Term>): Array<IndexedCode> {
  const affinity = chapterAffinity(terms)
  const scored: Array<{ entry: IndexedCode; score: number }> = []
  for (const entry of index.rows) {
    if (entry.code.length === 2) continue
    let score = 0
    let matchedAll = true
    for (const term of terms) {
      const own = entry.generic ? 0 : termScore(entry.text, term, OWN_WEIGHTS)
      const fromContext = own > 0 ? 0 : termScore(entry.contextText, term, CONTEXT_WEIGHTS)
      if (own === 0 && fromContext === 0) {
        matchedAll = false
        break
      }
      score += own + fromContext
    }
    if (!matchedAll) continue
    // Short, specific wording and full tariff items rank above long headings.
    score -= Math.min(entry.text.split(' ').length, 60) / 15
    score += entry.code.length === 8 ? 0.6 : entry.code.length === 6 ? 0.3 : 0
    score += affinity.get(entry.code.slice(0, 2)) ?? 0
    if (entry.generic) score -= 1
    scored.push({ entry, score })
  }

  // A sub-heading worded exactly like a code under it adds nothing.
  const covered = new Set<string>()
  for (const { entry } of scored) {
    for (const length of [4, 6]) {
      if (entry.code.length > length) covered.add(`${entry.code.slice(0, length)}|${entry.text}`)
    }
  }
  return scored
    .filter(({ entry }) => !covered.has(`${entry.code}|${entry.text}`))
    .sort((a, b) => b.score - a.score || (a.entry.code < b.entry.code ? -1 : 1))
    .map(({ entry }) => entry)
}

export function searchHsnCodes(
  index: HsnCodeIndex,
  query: string,
  options: { limit?: number } = {},
): HsnSearchResult {
  const limit = options.limit ?? 30
  const trimmed = query.trim()
  if (!trimmed) return { matches: [], total: 0 }

  const digits = trimmed.replace(/[\s.]/g, '')
  let found: Array<IndexedCode>
  if (/^\d{2,8}$/.test(digits)) {
    found = searchByCode(index, digits)
  } else {
    const terms = queryTerms(trimmed)
    found = terms.length > 0 ? searchByText(index, terms) : []
  }
  return { matches: found.slice(0, limit).map(toResult), total: found.length }
}

export type ChapterTreeItem = HsnCode & { depth: 1 | 2 }

export type ChapterTreeHeading = HsnCode & { items: Array<ChapterTreeItem> }

export type ChapterTree = {
  chapter: HsnCode | null
  headings: Array<ChapterTreeHeading>
  /** Codes whose four-digit heading is missing from the master. */
  loose: Array<ChapterTreeItem>
}

/** One chapter's codes as headings, each with its six- and eight-digit codes. */
export function buildChapterTree(rows: ReadonlyArray<HsnCodeRow>): ChapterTree {
  const index = createHsnCodeIndex(rows)
  const tree: ChapterTree = { chapter: null, headings: [], loose: [] }
  const headings = new Map<string, ChapterTreeHeading>()

  for (const entry of index.rows) {
    const result = toResult(entry)
    if (entry.code.length === 2) {
      tree.chapter = result
    } else if (entry.code.length === 4) {
      const heading = { ...result, items: [] }
      headings.set(entry.code, heading)
      tree.headings.push(heading)
    } else {
      const hasSixDigitParent = entry.code.length === 8 && index.byCode.has(entry.code.slice(0, 6))
      const item: ChapterTreeItem = { ...result, depth: hasSixDigitParent ? 2 : 1 }
      const heading = headings.get(entry.code.slice(0, 4))
      if (heading) heading.items.push(item)
      else tree.loose.push(item)
    }
  }
  return tree
}
