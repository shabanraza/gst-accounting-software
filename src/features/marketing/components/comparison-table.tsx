import { Link } from '@tanstack/react-router'
import { CheckIcon, XIcon } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import type { AlternativeSlug } from '#/features/marketing/alternatives-content.ts'
import { COMPARISON } from '#/features/marketing/landing-content.ts'
import { cn } from '#/lib/utils.ts'

const ALTERNATIVE_SLUG_BY_COLUMN: Partial<Record<string, AlternativeSlug>> = {
  Tally: 'tally',
  Busy: 'busy',
  Vyapar: 'vyapar',
  'Zoho Books': 'zoho-books',
  Marg: 'marg',
  myBillBook: 'mybillbook',
}

type CellKind = 'yes' | 'no' | 'text'

function cellKind(value: string): CellKind {
  if (/^Yes\b/i.test(value)) return 'yes'
  if (value === 'No') return 'no'
  return 'text'
}

function nuance(value: string) {
  const match = value.match(/^Yes\s*\((.+)\)$/i)
  return match?.[1] ?? null
}

function ComparisonValue({ value }: { value: string }) {
  const kind = cellKind(value)
  const note = nuance(value)

  if (kind === 'yes') {
    return (
      <span className="inline-flex flex-col items-center gap-1.5">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-money-in/15 text-money-in">
          <CheckIcon className="size-4" strokeWidth={2.5} />
        </span>
        {note ? (
          <span className="text-xs font-medium text-muted-foreground">{note}</span>
        ) : null}
      </span>
    )
  }

  if (kind === 'no') {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <XIcon className="size-4" strokeWidth={2.5} />
      </span>
    )
  }

  return (
    <span className="text-sm leading-snug text-muted-foreground md:text-[0.95rem]">
      {value}
    </span>
  )
}

export function ComparisonTable() {
  const textRows = new Set(['Pricing model'])

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-16 md:py-24"
      data-ui="chrome"
      id={COMPARISON.id}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-4 text-center md:mx-0 md:text-left">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {COMPARISON.title}
        </h2>
        <p className="text-base text-muted-foreground md:text-lg">
          {COMPARISON.subtitle}
        </p>
      </div>

      <div className="mt-12 overflow-x-auto rounded-[var(--radius-hero)] bg-card shadow-(--elevation-2)">
        <Table className="min-w-[72rem] text-base">
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              {COMPARISON.columns.map((column, index) => {
                const isProduct = index === 1
                const isFeature = index === 0
                const alternativeSlug = ALTERNATIVE_SLUG_BY_COLUMN[column]
                return (
                  <TableHead
                    key={column || 'feature'}
                    className={cn(
                      'h-auto px-5 py-5 font-medium whitespace-normal md:px-6 md:py-6',
                      isFeature &&
                        'sticky left-0 z-10 min-w-52 bg-card text-left text-sm text-muted-foreground',
                      isProduct &&
                        'min-w-40 text-center font-heading text-base font-semibold text-foreground md:text-lg',
                      !isFeature &&
                        !isProduct &&
                        'min-w-32 text-center text-sm text-muted-foreground md:text-base',
                    )}
                  >
                    {alternativeSlug ? (
                      <Link
                        className="hover:text-foreground hover:underline"
                        params={{ competitor: alternativeSlug }}
                        to="/alternatives/$competitor"
                      >
                        {column}
                      </Link>
                    ) : (
                      column
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMPARISON.rows.map((row) => {
              const isTextRow = textRows.has(row.label)
              return (
                <TableRow
                  key={row.label}
                  className={cn(
                    'border-border/40 hover:bg-transparent',
                    isTextRow && 'border-t border-border/70',
                  )}
                >
                  <TableCell
                    className={cn(
                      'sticky left-0 z-10 bg-card px-5 py-5 text-left text-sm font-medium text-foreground md:px-6 md:py-6 md:text-base',
                      isTextRow && 'font-semibold',
                    )}
                  >
                    {row.label}
                  </TableCell>
                  {row.values.map((value, index) => (
                    <TableCell
                      key={`${row.label}-${COMPARISON.columns[index + 1]}`}
                      className={cn(
                        'px-5 py-5 text-center align-middle whitespace-normal md:px-6 md:py-6',
                        index === 0 && 'font-medium text-foreground',
                      )}
                    >
                      {isTextRow ? (
                        <span
                          className={cn(
                            'text-sm leading-snug md:text-base',
                            index === 0
                              ? 'font-semibold text-foreground'
                              : 'text-muted-foreground',
                          )}
                        >
                          {value}
                        </span>
                      ) : (
                        <ComparisonValue value={value} />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
