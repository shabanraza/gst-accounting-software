import * as React from 'react'
import { PlusIcon, PrinterIcon, Trash2Icon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import {
  formatIndianDate,
  stateLabel,
} from '#/features/documents/gst-invoice-format.ts'
import { Field, StateSelect } from '#/features/tools/components/tool-fields.tsx'
import { validateGstin } from '#/features/tools/gstin-service.ts'
import { computeInvoice } from '#/features/tools/invoice-generator-service.ts'
import type { InvoiceLineInput } from '#/features/tools/invoice-generator-service.ts'
import { formatInrAmount } from '#/features/tools/payment-reminder-service.ts'
import { localCalendarDate } from '#/lib/calendar-date.ts'

type PartyDraft = { name: string; gstin: string; address: string; stateCode: string }

const EMPTY_LINE: InvoiceLineInput = { description: '', hsn: '', quantity: '1', rate: '', gstRate: '18' }

function PartyFields({
  title,
  party,
  onChange,
}: {
  title: string
  party: PartyDraft
  onChange: (party: PartyDraft) => void
}) {
  const id = React.useId()

  function updateGstin(gstin: string) {
    const check = validateGstin(gstin)
    onChange({ ...party, gstin, stateCode: check.valid ? check.stateCode : party.stateCode })
  }

  return (
    <Card data-ui="data">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Field id={`${id}-name`} label="Name">
          <Input id={`${id}-name`} onChange={(event) => onChange({ ...party, name: event.target.value })} value={party.name} />
        </Field>
        <Field id={`${id}-gstin`} label="GSTIN (leave blank if unregistered)">
          <Input
            className="font-mono uppercase"
            id={`${id}-gstin`}
            maxLength={15}
            onChange={(event) => updateGstin(event.target.value.toUpperCase())}
            spellCheck={false}
            value={party.gstin}
          />
        </Field>
        <Field id={`${id}-address`} label="Address">
          <Textarea id={`${id}-address`} onChange={(event) => onChange({ ...party, address: event.target.value })} rows={2} value={party.address} />
        </Field>
        <Field id={`${id}-state`} label="State">
          <StateSelect id={`${id}-state`} onChange={(stateCode) => onChange({ ...party, stateCode })} value={party.stateCode} />
        </Field>
      </CardContent>
    </Card>
  )
}

export function InvoiceGenerator() {
  const id = React.useId()
  const [seller, setSeller] = React.useState<PartyDraft>({ name: '', gstin: '', address: '', stateCode: '27' })
  const [buyer, setBuyer] = React.useState<PartyDraft>({ name: '', gstin: '', address: '', stateCode: '27' })
  const [invoiceNumber, setInvoiceNumber] = React.useState('INV/0001')
  const [invoiceDate, setInvoiceDate] = React.useState('')
  const [lines, setLines] = React.useState<Array<InvoiceLineInput>>([{ ...EMPTY_LINE }])

  React.useEffect(() => {
    setInvoiceDate((current) => current || localCalendarDate())
  }, [])

  const invoice = computeInvoice({
    sellerStateCode: seller.stateCode,
    placeOfSupplyCode: buyer.stateCode,
    lines,
  })

  function updateLine(index: number, patch: Partial<InvoiceLineInput>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <PartyFields onChange={setSeller} party={seller} title="Your business (seller)" />
        <PartyFields onChange={setBuyer} party={buyer} title="Bill to (buyer)" />
      </div>

      <Card data-ui="data">
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`${id}-number`} label="Invoice number">
              <Input id={`${id}-number`} maxLength={16} onChange={(event) => setInvoiceNumber(event.target.value)} value={invoiceNumber} />
            </Field>
            <Field id={`${id}-date`} label="Invoice date">
              <Input id={`${id}-date`} onChange={(event) => setInvoiceDate(event.target.value)} type="date" value={invoiceDate} />
            </Field>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[44rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-28">HSN/SAC</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-28 text-right">Rate (₹)</TableHead>
                  <TableHead className="w-20 text-right">GST %</TableHead>
                  <TableHead className="w-10"><span className="sr-only">Remove</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={index}>
                    <TableCell className="p-0">
                      <Input aria-label={`Item ${index + 1} description`} onChange={(event) => updateLine(index, { description: event.target.value })} value={line.description} variant="grid" />
                    </TableCell>
                    <TableCell className="p-0">
                      <Input aria-label={`Item ${index + 1} HSN`} className="font-mono" inputMode="numeric" onChange={(event) => updateLine(index, { hsn: event.target.value })} value={line.hsn} variant="grid" />
                    </TableCell>
                    <TableCell className="p-0">
                      <Input aria-label={`Item ${index + 1} quantity`} className="text-right font-mono" inputMode="decimal" onChange={(event) => updateLine(index, { quantity: event.target.value })} value={line.quantity} variant="grid" />
                    </TableCell>
                    <TableCell className="p-0">
                      <Input aria-label={`Item ${index + 1} rate`} className="text-right font-mono" inputMode="decimal" onChange={(event) => updateLine(index, { rate: event.target.value })} value={line.rate} variant="grid" />
                    </TableCell>
                    <TableCell className="p-0">
                      <Input aria-label={`Item ${index + 1} GST rate`} className="text-right font-mono" inputMode="decimal" onChange={(event) => updateLine(index, { gstRate: event.target.value })} value={line.gstRate} variant="grid" />
                    </TableCell>
                    <TableCell className="p-0 text-center">
                      <Button
                        aria-label={`Remove item ${index + 1}`}
                        disabled={lines.length === 1}
                        onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])} type="button" variant="outline">
              <PlusIcon data-icon="inline-start" />
              Add item
            </Button>
            <Button onClick={() => window.print()} type="button">
              <PrinterIcon data-icon="inline-start" />
              Print or save PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <InvoicePaper
        buyer={buyer}
        invoice={invoice}
        invoiceDate={invoiceDate}
        invoiceNumber={invoiceNumber}
        seller={seller}
      />
    </div>
  )
}

function InvoicePaper({
  seller,
  buyer,
  invoiceNumber,
  invoiceDate,
  invoice,
}: {
  seller: PartyDraft
  buyer: PartyDraft
  invoiceNumber: string
  invoiceDate: string
  invoice: ReturnType<typeof computeInvoice>
}) {
  return (
    <Card aria-label="Invoice preview" className="text-sm" data-print-root="" data-ui="data">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row">
          <div className="flex flex-col gap-0.5">
            <p className="font-heading text-lg font-semibold">{seller.name || 'Your business name'}</p>
            {seller.address ? <p className="whitespace-pre-line text-muted-foreground">{seller.address}</p> : null}
            {seller.gstin ? <p className="font-mono">GSTIN: {seller.gstin}</p> : null}
            <p className="text-muted-foreground">State: {stateLabel(seller.stateCode)}</p>
          </div>
          <div className="flex flex-col gap-0.5 sm:text-right">
            <p className="font-heading text-base font-semibold tracking-wide">TAX INVOICE</p>
            <p>
              No. <span className="font-mono">{invoiceNumber}</span>
            </p>
            <p>
              Date: <span className="font-mono">{formatIndianDate(invoiceDate)}</span>
            </p>
            <p>Place of supply: {stateLabel(buyer.stateCode)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">Bill to</p>
          <p className="font-medium">{buyer.name || 'Customer name'}</p>
          {buyer.address ? <p className="whitespace-pre-line text-muted-foreground">{buyer.address}</p> : null}
          {buyer.gstin ? <p className="font-mono">GSTIN: {buyer.gstin}</p> : null}
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[40rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>HSN/SAC</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Taxable</TableHead>
                <TableHead className="text-right">GST</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="whitespace-normal">{line.description}</TableCell>
                  <TableCell className="font-mono">{line.hsn}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{line.quantity}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{line.rate}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{line.taxableValue}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {line.gstAmount}
                    <span className="block text-xs text-muted-foreground">@{line.gstRate}%</span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{line.lineTotal}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-right" colSpan={7}>Taxable value</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{invoice.taxableTotal}</TableCell>
              </TableRow>
              {invoice.interState ? (
                <TableRow>
                  <TableCell className="text-right" colSpan={7}>IGST</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{invoice.igstTotal}</TableCell>
                </TableRow>
              ) : (
                <>
                  <TableRow>
                    <TableCell className="text-right" colSpan={7}>CGST</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{invoice.cgstTotal}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-right" colSpan={7}>SGST</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{invoice.sgstTotal}</TableCell>
                  </TableRow>
                </>
              )}
              <TableRow>
                <TableCell className="text-right" colSpan={7}>Round off</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{invoice.roundOff}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-right font-semibold" colSpan={7}>Total</TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  {formatInrAmount(invoice.grandTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        <p>
          <span className="text-muted-foreground">Amount in words: </span>
          {invoice.amountInWords}
        </p>
        <div className="flex justify-end pt-8">
          <p className="border-t border-border pt-1 text-xs text-muted-foreground">
            For {seller.name || 'your business'} — Authorised signatory
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
