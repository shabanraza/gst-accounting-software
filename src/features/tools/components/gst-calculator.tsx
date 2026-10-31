import * as React from 'react'

import { Card, CardContent } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group.tsx'
import { Field, ResultRow } from '#/features/tools/components/tool-fields.tsx'
import { calculateGst } from '#/features/tools/gst-calculator-service.ts'
import type { GstMode } from '#/features/tools/gst-calculator-service.ts'
import { formatInrAmount } from '#/features/tools/payment-reminder-service.ts'

const QUICK_RATES = ['5', '18', '40', '3', '0.25'] as const

export function GstCalculator({ defaultRate = '18' }: { defaultRate?: string }) {
  const id = React.useId()
  const [amount, setAmount] = React.useState('1000')
  const [rate, setRate] = React.useState(defaultRate)
  const [mode, setMode] = React.useState<GstMode>('exclusive')
  const [supply, setSupply] = React.useState<'intra' | 'inter'>('intra')

  const result = calculateGst({ amount, rate, mode, interState: supply === 'inter' })
  const halfRate = rate ? `${Number(rate) / 2}%` : ''

  return (
    <Card data-ui="data">
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Field id={`${id}-amount`} label={mode === 'exclusive' ? 'Amount before GST (₹)' : 'Amount including GST (₹)'}>
            <Input
              className="h-9 font-mono text-base"
              id={`${id}-amount`}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              value={amount}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Label id={`${id}-rate-label`}>GST rate</Label>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                aria-labelledby={`${id}-rate-label`}
                onValueChange={(value) => value && setRate(value)}
                type="single"
                value={rate}
                variant="outline"
              >
                {QUICK_RATES.map((value) => (
                  <ToggleGroupItem key={value} className="min-w-12" value={value}>
                    {value}%
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Input
                aria-label="Custom GST rate"
                className="h-8 w-20 font-mono"
                inputMode="decimal"
                onChange={(event) => setRate(event.target.value)}
                value={rate}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label id={`${id}-mode-label`}>Amount is</Label>
            <ToggleGroup
              aria-labelledby={`${id}-mode-label`}
              onValueChange={(value) => value && setMode(value as GstMode)}
              type="single"
              value={mode}
              variant="outline"
            >
              <ToggleGroupItem value="exclusive">Before GST (add)</ToggleGroupItem>
              <ToggleGroupItem value="inclusive">Including GST (remove)</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-col gap-2">
            <Label id={`${id}-supply-label`}>Customer is</Label>
            <ToggleGroup
              aria-labelledby={`${id}-supply-label`}
              onValueChange={(value) => value && setSupply(value as 'intra' | 'inter')}
              type="single"
              value={supply}
              variant="outline"
            >
              <ToggleGroupItem value="intra">In my state</ToggleGroupItem>
              <ToggleGroupItem value="inter">In another state</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        <div aria-live="polite" className="rounded-lg bg-muted/40 p-4">
          {result ? (
            <dl>
              <ResultRow label="Taxable value" value={formatInrAmount(result.taxableValue)} />
              {supply === 'intra' ? (
                <>
                  <ResultRow label={`CGST @ ${halfRate}`} value={formatInrAmount(result.cgst)} />
                  <ResultRow label={`SGST @ ${halfRate}`} value={formatInrAmount(result.sgst)} />
                </>
              ) : (
                <ResultRow label={`IGST @ ${rate}%`} value={formatInrAmount(result.igst)} />
              )}
              <ResultRow label="Total GST" value={formatInrAmount(result.gstAmount)} />
              <ResultRow emphasis label="Total amount" value={formatInrAmount(result.total)} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Enter an amount and a rate between 0 and 100.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
