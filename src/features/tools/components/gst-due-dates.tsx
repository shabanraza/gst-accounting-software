import * as React from 'react'

import { Badge } from '#/components/ui/badge.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group.tsx'
import { Field, StateSelect } from '#/features/tools/components/tool-fields.tsx'
import { upcomingDueDates } from '#/features/tools/gst-due-dates-service.ts'
import type { FilerType } from '#/features/tools/gst-due-dates-service.ts'
import { toolCheckBadgeIntent } from '#/lib/badge-intent.ts'
import {
  formatMediumDate,
  localCalendarDate,
  parseCalendarDate,
} from '#/lib/calendar-date.ts'

const DAY_MS = 24 * 60 * 60 * 1000

function daysUntil(from: string, to: string): number {
  return Math.round((parseCalendarDate(to).getTime() - parseCalendarDate(from).getTime()) / DAY_MS)
}

export function GstDueDates() {
  const id = React.useId()
  const [filerType, setFilerType] = React.useState<FilerType>('monthly')
  const [stateCode, setStateCode] = React.useState('27')
  // Today is read on the client so the server render never shows a stale date.
  const [today, setToday] = React.useState('')
  React.useEffect(() => {
    setToday(localCalendarDate())
  }, [])

  const entries = today ? upcomingDueDates({ filerType, stateCode, from: today, count: 10 }) : []

  return (
    <Card data-ui="data">
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label id={`${id}-filer-label`}>I file as</Label>
            <ToggleGroup
              aria-labelledby={`${id}-filer-label`}
              className="flex-wrap"
              onValueChange={(value) => value && setFilerType(value as FilerType)}
              type="single"
              value={filerType}
              variant="outline"
            >
              <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
              <ToggleGroupItem value="qrmp">Quarterly (QRMP)</ToggleGroupItem>
              <ToggleGroupItem value="composition">Composition</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Field id={`${id}-state`} label="State of registration">
            <StateSelect id={`${id}-state`} onChange={setStateCode} value={stateCode} />
          </Field>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return</TableHead>
                <TableHead className="hidden sm:table-cell">Period</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Days left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const days = daysUntil(today, entry.dueDate)
                return (
                  <TableRow key={`${entry.form}-${entry.period}`}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{entry.form}</span>
                        <span className="text-xs whitespace-normal text-muted-foreground">
                          <span className="sm:hidden">{entry.period} · </span>
                          {entry.note}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{entry.period}</TableCell>
                    <TableCell className="font-mono tabular-nums">
                      {formatMediumDate(entry.dueDate)}
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <Badge variant={toolCheckBadgeIntent(days <= 7 ? 'action' : 'info')}>
                        {days === 0 ? 'Today' : `${days} days`}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
