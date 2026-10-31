import * as React from 'react'
import { CircleCheckIcon, CircleXIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Field, ResultRow } from '#/features/tools/components/tool-fields.tsx'
import { validateGstin } from '#/features/tools/gstin-service.ts'
import { toolCheckBadgeIntent } from '#/lib/badge-intent.ts'
import type { GstinResult } from '#/features/tools/gstin-service.ts'

function failureMessage(result: Extract<GstinResult, { valid: false }>): string {
  switch (result.reason) {
    case 'length':
      return 'A GSTIN has exactly 15 characters.'
    case 'format':
      return 'The pattern is wrong: 2 digits, a 10-character PAN, an entity number, Z, and a check character.'
    case 'state':
      return 'The first two digits are not a GST state code.'
    case 'checksum':
      return `The last character should be ${result.expectedCheckDigit ?? ''} — there is probably a typing mistake.`
  }
}

export function GstinValidator() {
  const id = React.useId()
  const [value, setValue] = React.useState('')
  const result = value.trim() ? validateGstin(value) : null

  return (
    <Card className="max-w-2xl" data-ui="data">
      <CardContent className="flex flex-col gap-4">
        <Field id={`${id}-gstin`} label="GSTIN">
          <Input
            autoCapitalize="characters"
            className="h-10 font-mono text-base tracking-wider uppercase"
            id={`${id}-gstin`}
            maxLength={20}
            onChange={(event) => setValue(event.target.value)}
            placeholder="27AAPFU0939F1ZV"
            spellCheck={false}
            value={value}
          />
        </Field>
        <div aria-live="polite">
          {result?.valid ? (
            <div className="flex flex-col gap-3">
              <Badge className="self-start" variant={toolCheckBadgeIntent('pass')}>
                <CircleCheckIcon data-icon="inline-start" />
                Valid format and check digit
              </Badge>
              <dl className="rounded-lg bg-muted/40 px-4 py-2">
                <ResultRow label="State" value={`${result.stateCode} – ${result.stateName}`} />
                <ResultRow label="PAN" value={result.pan} />
                <ResultRow label="Entity type" value={result.entityType} />
                <ResultRow label="Registration in this state" value={`#${result.registrationNumber}`} />
              </dl>
            </div>
          ) : null}
          {result && !result.valid ? (
            <div className="flex flex-col gap-2">
              <Badge className="self-start" variant={toolCheckBadgeIntent('fail')}>
                <CircleXIcon data-icon="inline-start" />
                Not a valid GSTIN
              </Badge>
              <p className="text-sm text-muted-foreground">{failureMessage(result)}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
