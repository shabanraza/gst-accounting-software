import * as React from 'react'

import { Badge } from '#/components/ui/badge.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx'
import { Checkbox } from '#/components/ui/checkbox.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group.tsx'
import { Field } from '#/features/tools/components/tool-fields.tsx'
import {
  E_INVOICE_EXEMPT_CATEGORIES,
  checkEInvoice,
  checkEWayBill,
} from '#/features/tools/e-invoice-applicability-service.ts'
import type {
  EInvoiceExemptCategory,
  EInvoiceResult,
  EWayBillResult,
} from '#/features/tools/e-invoice-applicability-service.ts'
import { toolCheckBadgeIntent } from '#/lib/badge-intent.ts'

function EInvoiceVerdict({ result }: { result: EInvoiceResult }) {
  if (result.status === 'invalid') {
    return <p className="text-sm text-muted-foreground">Enter your highest annual turnover in crore, for example 6.5.</p>
  }
  if (result.status === 'required') {
    return (
      <div className="flex flex-col gap-2">
        <Badge className="self-start" variant={toolCheckBadgeIntent('action')}>
          E-invoicing applies
        </Badge>
        <p className="text-sm text-muted-foreground">
          Generate an IRN for every B2B invoice, export, and credit or debit note.
          {result.reportingWindowDays
            ? ` At your turnover, each invoice must be reported within ${result.reportingWindowDays} days of its date.`
            : ''}
        </p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <Badge className="self-start" variant={toolCheckBadgeIntent('pass')}>
        {result.status === 'exempt' ? 'Exempt from e-invoicing' : 'E-invoicing does not apply yet'}
      </Badge>
      <p className="text-sm text-muted-foreground">
        {result.status === 'exempt'
          ? 'Your category is exempt whatever the turnover. Issue normal tax invoices.'
          : 'It starts once aggregate turnover exceeds ₹5 crore in any financial year from 2017-18.'}
      </p>
    </div>
  )
}

const E_WAY_COPY: Record<EWayBillResult, { outcome: 'pass' | 'action' | 'info'; title: string; body: string }> = {
  required: {
    outcome: 'action',
    title: 'E-way bill needed',
    body: 'Generate it on the e-way bill portal before the goods move.',
  },
  'not-required': {
    outcome: 'pass',
    title: 'No e-way bill needed',
    body: 'The consignment is within the ₹50,000 limit. Carry the tax invoice or delivery challan.',
  },
  'check-state-limit': {
    outcome: 'info',
    title: 'Depends on your state',
    body: 'Above ₹50,000 within a state you need one unless your state has notified a higher limit. Check your state’s notification.',
  },
  invalid: {
    outcome: 'info',
    title: 'Enter the consignment value',
    body: 'Use the total value including GST, leaving out exempt goods.',
  },
}

export function EInvoiceChecker() {
  const id = React.useId()
  const [aato, setAato] = React.useState('')
  const [category, setCategory] = React.useState<EInvoiceExemptCategory>('none')
  const [value, setValue] = React.useState('')
  const [movement, setMovement] = React.useState<'inter' | 'intra'>('inter')
  const [specialCase, setSpecialCase] = React.useState(false)

  const eInvoice = checkEInvoice({ highestAatoCrore: aato, exemptCategory: category })
  const eWay = E_WAY_COPY[
    checkEWayBill({ consignmentValue: value, interState: movement === 'inter', specialCase })
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card data-ui="data">
        <CardHeader>
          <CardTitle className="text-base">Do I need e-invoicing?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field id={`${id}-aato`} label="Highest annual turnover since 2017-18 (₹ crore)">
            <Input
              className="h-9 font-mono"
              id={`${id}-aato`}
              inputMode="decimal"
              onChange={(event) => setAato(event.target.value)}
              placeholder="6.5"
              value={aato}
            />
          </Field>
          <Field id={`${id}-category`} label="Is your business one of these?">
            <Select
              onValueChange={(next) => setCategory(next as EInvoiceExemptCategory)}
              value={category}
            >
              <SelectTrigger className="w-full" id={`${id}-category`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {E_INVOICE_EXEMPT_CATEGORIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div aria-live="polite">
            {aato.trim() ? <EInvoiceVerdict result={eInvoice} /> : null}
          </div>
        </CardContent>
      </Card>

      <Card data-ui="data">
        <CardHeader>
          <CardTitle className="text-base">Does this shipment need an e-way bill?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field id={`${id}-value`} label="Consignment value including GST (₹)">
            <Input
              className="h-9 font-mono"
              id={`${id}-value`}
              inputMode="decimal"
              onChange={(event) => setValue(event.target.value)}
              placeholder="65000"
              value={value}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Label id={`${id}-movement-label`}>Goods are moving</Label>
            <ToggleGroup
              aria-labelledby={`${id}-movement-label`}
              onValueChange={(next) => next && setMovement(next as 'inter' | 'intra')}
              type="single"
              value={movement}
              variant="outline"
            >
              <ToggleGroupItem value="inter">To another state</ToggleGroupItem>
              <ToggleGroupItem value="intra">Within my state</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={specialCase}
              id={`${id}-special`}
              onCheckedChange={(checked) => setSpecialCase(checked === true)}
            />
            <Label htmlFor={`${id}-special`}>Job work or handicraft goods</Label>
          </div>
          <div aria-live="polite">
            {value.trim() ? (
              <div className="flex flex-col gap-2">
                <Badge className="self-start" variant={toolCheckBadgeIntent(eWay.outcome)}>
                  {eWay.title}
                </Badge>
                <p className="text-sm text-muted-foreground">{eWay.body}</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
