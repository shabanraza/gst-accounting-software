import { Fragment, useState } from 'react'
import { skipToken, useQuery } from '@tanstack/react-query'
import { ChevronRightIcon, DownloadIcon, HistoryIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  auditActionLabel,
  auditCategoryLabels,
  auditEventAmount,
  auditEventChanges,
  auditEventLabel,
  buildAuditCsv,
  filterAuditEvents,
  listAuditActors,
} from '#/features/audit/audit-log-view.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { auditActionBadgeIntent } from '#/lib/badge-intent.ts'
import { localCalendarDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { cn } from '#/lib/utils.ts'

import type { AuditLogFilter } from '#/features/audit/audit-log-view.ts'

const COLUMN_COUNT = 6

function saveCsvFile(text: string, fileName: string) {
  // BOM so Excel opens the file as UTF-8 (₹, →, Indian names).
  const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AuditLogViewer() {
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()
  const [filter, setFilter] = useState<AuditLogFilter>({
    category: 'all',
    actorUserId: 'all',
    fromDate: '',
    toDate: '',
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const auditQuery = useQuery(
    trpc.audit.list.queryOptions(
      companyId && isReady ? { companyId } : skipToken,
    ),
  )

  const allEvents = auditQuery.data ?? []
  const actors = listAuditActors(allEvents)
  const events = filterAuditEvents(allEvents, filter)
  const updateFilter = (patch: Partial<AuditLogFilter>) =>
    setFilter((current) => ({ ...current, ...patch }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HistoryIcon className="size-4 text-muted-foreground" />
          Audit log
        </CardTitle>
        <CardDescription>
          Who changed documents, masters, team and company details, and when.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-0" data-ui="data">
        <div className="flex flex-wrap items-center gap-2 px-4">
          <Select
            onValueChange={(value) =>
              updateFilter({ category: value as AuditLogFilter['category'] })
            }
            value={filter.category}
          >
            <SelectTrigger aria-label="Action type" className="w-full sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All actions</SelectItem>
                {Object.entries(auditCategoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => updateFilter({ actorUserId: value })}
            value={filter.actorUserId}
          >
            <SelectTrigger aria-label="Who" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Everyone</SelectItem>
                {actors.map((actor) => (
                  <SelectItem key={actor.id} value={actor.id}>
                    {actor.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <DatePicker
              className="min-w-0 flex-1 sm:w-32 sm:flex-none"
              max={filter.toDate || undefined}
              onChange={(value) => updateFilter({ fromDate: value })}
              placeholder="From"
              value={filter.fromDate}
              variant="toolbar"
            />
            <DatePicker
              className="min-w-0 flex-1 sm:w-32 sm:flex-none"
              min={filter.fromDate || undefined}
              onChange={(value) => updateFilter({ toDate: value })}
              placeholder="To"
              value={filter.toDate}
              variant="toolbar"
            />
          </div>
          <Button
            className="sm:ml-auto"
            disabled={events.length === 0}
            onClick={() =>
              saveCsvFile(
                buildAuditCsv(events),
                `audit-log-${localCalendarDate()}.csv`,
              )
            }
            variant="outline"
          >
            <DownloadIcon data-icon="inline-start" />
            Export CSV
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={COLUMN_COUNT}
                >
                  {allEvents.length === 0
                    ? 'No audit events recorded yet.'
                    : 'No audit events match these filters.'}
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => {
                const label = auditEventLabel(event.metadata)
                const amount = auditEventAmount(event.metadata)
                const changes = auditEventChanges(event.metadata)
                const expanded = expandedId === event.id
                return (
                  <Fragment key={event.id}>
                    <TableRow>
                      <TableCell className="w-8 pr-0">
                        {changes.length > 0 ? (
                          <Button
                            aria-expanded={expanded}
                            aria-label={
                              expanded ? 'Hide changes' : 'Show changes'
                            }
                            onClick={() =>
                              setExpandedId(expanded ? null : event.id)
                            }
                            size="icon-xs"
                            variant="ghost"
                          >
                            <ChevronRightIcon
                              className={cn(
                                'transition-transform duration-(--duration-fast) ease-(--ease-precise)',
                                expanded && 'rotate-90',
                              )}
                            />
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="max-w-40 truncate">
                        {event.actorName || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={auditActionBadgeIntent(event.action)}>
                          {auditActionLabel(event.action)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-medium">
                        {label || '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {amount ? formatInr(amount) : '—'}
                      </TableCell>
                    </TableRow>
                    {expanded ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell />
                        <TableCell colSpan={COLUMN_COUNT - 1}>
                          <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs">
                            {changes.map((change) => (
                              <Fragment key={change.field}>
                                <dt className="truncate text-muted-foreground">
                                  {change.field}
                                </dt>
                                <dd className="min-w-0 break-words">
                                  <span className="text-muted-foreground line-through">
                                    {change.from || '—'}
                                  </span>{' '}
                                  → {change.to || '—'}
                                </dd>
                              </Fragment>
                            ))}
                          </dl>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
