import * as React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRightIcon, ExternalLinkIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '#/components/ui/table.tsx'
import { buildChapterTree, displayDescription, searchHsnCodes } from '#/features/tools/hsn-codes.ts'
import type {
  ChapterTreeHeading,
  ChapterTreeItem,
  HsnCode,
  HsnCodeIndex,
  HsnCodeRow,
} from '#/features/tools/hsn-codes.ts'
import { loadHsnCodeIndex } from '#/features/tools/hsn-data-loader.ts'
import { HSN_CHAPTERS, searchHsn } from '#/features/tools/hsn-service.ts'
import type { HsnChapter } from '#/features/tools/hsn-service.ts'
import { HSN_SOURCE } from '#/features/tools/hsn-source.ts'
import { cn } from '#/lib/utils.ts'

export const CBIC_RATE_FINDER_URL = 'https://cbic-gst.gov.in/gst-goods-services-rates.html'

const RESULT_LIMIT = 30

function codeAnchor(code: string) {
  return `hsn-${code}`
}

function shorten(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text
}

function ChapterLink({ chapter }: { chapter: HsnChapter }) {
  return (
    <Link
      className="flex items-baseline gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
      params={{ chapter: chapter.slug }}
      to="/tools/hsn-code-finder/$chapter"
    >
      <span className="font-mono text-muted-foreground tabular-nums">{chapter.code}</span>
      <span className="text-foreground">{chapter.title}</span>
    </Link>
  )
}

function CodeResult({ match }: { match: HsnCode }) {
  return (
    <Link
      className="flex gap-3 rounded-md px-2 py-2 hover:bg-muted"
      hash={codeAnchor(match.code)}
      params={{ chapter: `chapter-${match.code.slice(0, 2)}` }}
      to="/tools/hsn-code-finder/$chapter"
    >
      <span className="w-20 shrink-0 font-mono text-sm tabular-nums">{match.code}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="line-clamp-2 text-sm text-foreground">{displayDescription(match)}</span>
        {match.context.length > 0 ? (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {match.context.map((parent) => `${parent.code} ${shorten(parent.description, 70)}`).join(' › ')}
          </span>
        ) : null}
      </span>
    </Link>
  )
}

function SourceNote() {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>
        Source: {HSN_SOURCE.name}, {HSN_SOURCE.date}
      </span>
      <a
        className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
        href={CBIC_RATE_FINDER_URL}
        rel="noreferrer"
        target="_blank"
      >
        GST rates on CBIC
        <ExternalLinkIcon className="size-3" />
      </a>
    </p>
  )
}

export function HsnFinder() {
  const [query, setQuery] = React.useState('')
  const [index, setIndex] = React.useState<HsnCodeIndex | null>(null)
  const [loadFailed, setLoadFailed] = React.useState(false)
  const searchQuery = React.useDeferredValue(query)

  const startLoading = () => {
    if (index) return
    setLoadFailed(false)
    loadHsnCodeIndex().then(setIndex, () => setLoadFailed(true))
  }

  const chapters = searchHsn(searchQuery).slice(0, 4)
  const codes = index ? searchHsnCodes(index, searchQuery, { limit: RESULT_LIMIT }) : null
  const hasQuery = searchQuery.trim() !== ''

  return (
    <Card data-ui="data">
      <CardContent className="flex flex-col gap-4">
        <SearchInput
          aria-label="Search HSN or SAC by product or code"
          onChange={(event) => {
            setQuery(event.target.value)
            startLoading()
          }}
          onFocus={startLoading}
          placeholder="Try “smartphone”, “saree”, “8517”, or “restaurant”"
          value={query}
        />
        <div aria-live="polite" className="flex flex-col gap-4">
          {hasQuery && chapters.length > 0 ? (
            <div className="flex flex-col gap-1">
              <h3 className="px-2 text-xs font-medium text-muted-foreground">Chapters</h3>
              <ul className="flex flex-col">
                {chapters.map((chapter) => (
                  <li key={chapter.code}>
                    <ChapterLink chapter={chapter} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {hasQuery ? (
            <div className="flex flex-col gap-1">
              <h3 className="px-2 text-xs font-medium text-muted-foreground">Codes</h3>
              {codes === null ? (
                loadFailed ? (
                  <p className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                    Codes could not be loaded.
                    <Button onClick={startLoading} size="sm" variant="link">
                      Try again
                    </Button>
                  </p>
                ) : (
                  <p className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                    <Spinner />
                    Loading codes
                  </p>
                )
              ) : codes.total === 0 ? (
                <p className="px-2 text-sm text-muted-foreground">
                  No code matched. Try a more general word, such as “clothing” instead of a brand name.
                </p>
              ) : (
                <>
                  <ul className="flex flex-col">
                    {codes.matches.map((match) => (
                      <li key={match.code}>
                        <CodeResult match={match} />
                      </li>
                    ))}
                  </ul>
                  {codes.total > codes.matches.length ? (
                    <p className="px-2 pt-1 text-xs text-muted-foreground tabular-nums">
                      Showing {codes.matches.length} of {codes.total} matching codes
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </div>
        <SourceNote />
      </CardContent>
    </Card>
  )
}

export function HsnChapterIndex() {
  const sections = new Map<string, Array<HsnChapter>>()
  for (const chapter of HSN_CHAPTERS) {
    const key = `${chapter.section.roman}|${chapter.section.title}`
    sections.set(key, [...(sections.get(key) ?? []), chapter])
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8" data-ui="chrome">
      <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
        All HSN chapters
      </h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {[...sections.entries()].map(([key, chapters]) => {
          const [roman, title] = key.split('|')
          return (
            <div key={key} className="flex flex-col gap-1">
              <h3 className="text-sm font-medium text-muted-foreground">
                {roman === 'SAC' ? title : `Section ${roman}: ${title}`}
              </h3>
              <ul className="flex flex-col">
                {chapters.map((chapter) => (
                  <li key={chapter.code}>
                    <ChapterLink chapter={chapter} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function HsnChapterDetail({ chapter, codeCount }: { chapter: HsnChapter; codeCount: number }) {
  const isServices = chapter.code === '99'
  return (
    <Card data-ui="data">
      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Chapter</dt>
          <dd className="font-mono">{chapter.code}</dd>
          <dt className="text-muted-foreground">Covers</dt>
          <dd>{chapter.title}</dd>
          <dt className="text-muted-foreground">Section</dt>
          <dd>
            {chapter.section.roman === 'SAC'
              ? chapter.section.title
              : `${chapter.section.roman} — ${chapter.section.title}`}
          </dd>
          <dt className="text-muted-foreground">Code format</dt>
          <dd className="font-mono">
            {isServices ? '99xx (heading) · 99xxxx (SAC)' : `${chapter.code}xx (heading) · ${chapter.code}xxxx · ${chapter.code}xxxxxx`}
          </dd>
          <dt className="text-muted-foreground">{isServices ? 'SAC codes' : 'HSN codes'}</dt>
          <dd className="tabular-nums">{codeCount}</dd>
        </dl>
        <a
          className="inline-flex items-center gap-1 self-start text-sm text-foreground underline-offset-4 hover:underline"
          href={CBIC_RATE_FINDER_URL}
          rel="noreferrer"
          target="_blank"
        >
          Check the current GST rate on CBIC
          <ExternalLinkIcon className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  )
}

export function HsnSectionSiblings({ chapter }: { chapter: HsnChapter }) {
  const siblings = HSN_CHAPTERS.filter(
    (candidate) => candidate.section.roman === chapter.section.roman && candidate.code !== chapter.code,
  )
  if (siblings.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Other chapters in this section</h2>
      <ul className="flex flex-col">
        {siblings.map((sibling) => (
          <li key={sibling.code}>
            <ChapterLink chapter={sibling} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function CodeRows({ items }: { items: ReadonlyArray<ChapterTreeItem> }) {
  return (
    <Table>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.code} className="scroll-mt-24 target:bg-muted" id={codeAnchor(item.code)}>
            <TableCell className="w-24 align-top font-mono tabular-nums">{item.code}</TableCell>
            <TableCell
              className={cn(
                'whitespace-normal',
                item.depth === 2 && 'pl-6',
                item.code.length === 6 && 'font-medium',
              )}
            >
              {displayDescription(item)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function HeadingRow({ heading }: { heading: ChapterTreeHeading }) {
  const label = (
    <>
      <span className="w-12 shrink-0 font-mono tabular-nums">{heading.code}</span>
      <span className="min-w-0 flex-1 line-clamp-3 group-open:line-clamp-none">{displayDescription(heading)}</span>
    </>
  )

  if (heading.items.length === 0) {
    return (
      <div className="flex items-start gap-3 py-2.5 pl-7 text-sm" id={codeAnchor(heading.code)}>
        {label}
      </div>
    )
  }

  return (
    <details className="group scroll-mt-24" id={codeAnchor(heading.code)}>
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-md py-2.5 text-sm hover:bg-muted [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        {label}
        <span className="shrink-0 pr-2 text-xs text-muted-foreground tabular-nums">{heading.items.length}</span>
      </summary>
      <div className="pb-3 pl-7">
        <CodeRows items={heading.items} />
      </div>
    </details>
  )
}

/** Opens the heading that holds the code in the URL hash and scrolls to it. */
function useRevealHashTarget() {
  const hash = useLocation({ select: (location) => location.hash })
  React.useEffect(() => {
    const id = hash.replace(/^#/, '')
    if (!id) return
    const target = document.getElementById(id)
    if (!target) return
    target.closest('details')?.setAttribute('open', '')
    target.scrollIntoView({ block: 'start' })
  }, [hash])
}

export function HsnChapterCodes({ chapter, rows }: { chapter: HsnChapter; rows: ReadonlyArray<HsnCodeRow> }) {
  useRevealHashTarget()
  const tree = buildChapterTree(rows)
  if (tree.headings.length === 0 && tree.loose.length === 0) return null

  return (
    <Card data-ui="data">
      <CardContent className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {chapter.code === '99' ? 'SAC code list' : `HSN codes in chapter ${chapter.code}`}
        </h2>
        <ul className="flex flex-col divide-y divide-border">
          {tree.headings.map((heading) => (
            <li key={heading.code}>
              <HeadingRow heading={heading} />
            </li>
          ))}
        </ul>
        {tree.loose.length > 0 ? (
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-muted-foreground">Other codes</h3>
            <CodeRows items={tree.loose} />
          </div>
        ) : null}
        <SourceNote />
      </CardContent>
    </Card>
  )
}
