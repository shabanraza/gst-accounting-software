import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ExternalLinkIcon } from 'lucide-react'

import { Card, CardContent } from '#/components/ui/card.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { HSN_CHAPTERS, searchHsn } from '#/features/tools/hsn-service.ts'
import type { HsnChapter } from '#/features/tools/hsn-service.ts'

export const CBIC_RATE_FINDER_URL = 'https://cbic-gst.gov.in/gst-goods-services-rates.html'

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

export function HsnFinder() {
  const [query, setQuery] = React.useState('')
  const results = searchHsn(query)

  return (
    <Card data-ui="data">
      <CardContent className="flex flex-col gap-4">
        <SearchInput
          aria-label="Search HSN or SAC by product or code"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “mobile phone”, “saree”, “8517”, or “restaurant”"
          value={query}
        />
        <div aria-live="polite">
          {query.trim() ? (
            results.length > 0 ? (
              <ul className="flex flex-col">
                {results.map((chapter) => (
                  <li key={chapter.code}>
                    <ChapterLink chapter={chapter} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No chapter matched. Try a more general word, such as “clothing” instead of a brand name.
              </p>
            )
          ) : null}
        </div>
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

export function HsnChapterDetail({ chapter }: { chapter: HsnChapter }) {
  const siblings = HSN_CHAPTERS.filter(
    (candidate) => candidate.section.roman === chapter.section.roman && candidate.code !== chapter.code,
  )

  return (
    <div className="flex flex-col gap-6">
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
              {chapter.code === '99' ? '99xx (heading) · 99xxxx (SAC)' : `${chapter.code}xx (heading) · ${chapter.code}xxxx · ${chapter.code}xxxxxx`}
            </dd>
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

      {chapter.sacHeadings ? (
        <Card data-ui="data">
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">SAC</TableHead>
                  <TableHead>Service group</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chapter.sacHeadings.map((heading) => (
                  <TableRow key={heading.code}>
                    <TableCell className="font-mono">{heading.code}</TableCell>
                    <TableCell className="whitespace-normal">{heading.title}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {siblings.length > 0 ? (
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
      ) : null}
    </div>
  )
}
