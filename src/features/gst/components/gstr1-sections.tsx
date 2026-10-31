import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { stateLabel } from '#/features/app-shell/data/india-masters.ts'
import { formatMediumDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'

import type {
  Gstr1DocumentSeries,
  Gstr1Line,
  Gstr1RateRow,
  Gstr1Report,
} from '#/features/gst/gstr1-report-service.ts'
import type { Gstr1HsnRow } from '#/features/gst/hsn-summary-service.ts'

function sectionTotals(rows: Array<Gstr1RateRow>) {
  let taxable = 0
  let tax = 0
  for (const row of rows) {
    taxable += Number(row.taxableAmount)
    tax +=
      Number(row.igstAmount) + Number(row.cgstAmount) + Number(row.sgstAmount)
  }
  return `Taxable ${formatInr(taxable)} · Tax ${formatInr(tax)}`
}

function TaxCells({ row }: { row: Gstr1RateRow }) {
  return (
    <>
      <TableCell className="tabular-nums">{Number(row.gstRate)}%</TableCell>
      <TableCell>{formatInr(row.taxableAmount)}</TableCell>
      <TableCell>{formatInr(row.igstAmount)}</TableCell>
      <TableCell>{formatInr(row.cgstAmount)}</TableCell>
      <TableCell>{formatInr(row.sgstAmount)}</TableCell>
    </>
  )
}

function TaxHeads() {
  return (
    <>
      <TableHead>Rate</TableHead>
      <TableHead>Taxable</TableHead>
      <TableHead>IGST</TableHead>
      <TableHead>CGST</TableHead>
      <TableHead>SGST</TableHead>
    </>
  )
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        className="py-10 text-center text-muted-foreground"
        colSpan={colSpan}
      >
        {label}
      </TableCell>
    </TableRow>
  )
}

/** One portal section of invoices or notes, with a row per GST rate. */
function DocumentSection({
  title,
  documentLabel,
  emptyLabel,
  lines,
  showParty,
}: {
  title: string
  documentLabel: string
  emptyLabel: string
  lines: Array<Gstr1Line>
  showParty: boolean
}) {
  const columns = showParty ? 9 : 8
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {sectionTotals(lines.flatMap((line) => line.rates))}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{documentLabel}</TableHead>
              <TableHead>Date</TableHead>
              {showParty ? <TableHead>Party</TableHead> : null}
              <TableHead>Place of supply</TableHead>
              <TaxHeads />
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <EmptyRow colSpan={columns} label={emptyLabel} />
            ) : (
              lines.flatMap((line) =>
                line.rates.map((rate, index) => (
                  <TableRow key={`${line.invoiceNumber}-${rate.gstRate}`}>
                    {index === 0 ? (
                      <>
                        <TableCell className="font-medium">
                          {line.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {formatMediumDate(line.documentDate)}
                        </TableCell>
                        {showParty ? (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="truncate">{line.partyName}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {line.partyGstin}
                              </span>
                            </div>
                          </TableCell>
                        ) : null}
                        <TableCell>{stateLabel(line.placeOfSupply)}</TableCell>
                      </>
                    ) : (
                      <TableCell colSpan={showParty ? 4 : 3} />
                    )}
                    <TaxCells row={rate} />
                  </TableRow>
                )),
              )
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function HsnSection({
  title,
  emptyLabel,
  rows,
}: {
  title: string
  emptyLabel: string
  rows: Array<Gstr1HsnRow>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{sectionTotals(rows)}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>HSN</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>UQC</TableHead>
              <TableHead>Quantity</TableHead>
              <TaxHeads />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <EmptyRow colSpan={9} label={emptyLabel} />
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.hsnCode}-${row.uqc}-${row.gstRate}`}>
                  <TableCell className="font-mono font-medium">
                    {row.hsnCode}
                  </TableCell>
                  <TableCell className="max-w-48 truncate">
                    {row.description}
                  </TableCell>
                  <TableCell>{row.uqc}</TableCell>
                  <TableCell className="tabular-nums">
                    {Number(row.quantity)}
                  </TableCell>
                  <TaxCells row={row} />
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

const documentTypeLabel: Record<Gstr1DocumentSeries['documentType'], string> =
  {
    invoice: 'Invoices for outward supply',
    credit_note: 'Credit notes',
  }

function DocumentsIssuedSection({
  series,
}: {
  series: Array<Gstr1DocumentSeries>
}) {
  const total = series.reduce((sum, row) => sum + row.total, 0)
  const cancelled = series.reduce((sum, row) => sum + row.cancelled, 0)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">13 · Documents issued</CardTitle>
        <CardDescription>
          {`Total ${total} · Cancelled ${cancelled} · Net issued ${total - cancelled}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Cancelled</TableHead>
              <TableHead>Net issued</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.length === 0 ? (
              <EmptyRow colSpan={6} label="No documents issued in period." />
            ) : (
              series.map((row) => (
                <TableRow key={`${row.documentType}-${row.series}`}>
                  <TableCell className="font-medium">
                    {documentTypeLabel[row.documentType]}
                  </TableCell>
                  <TableCell>{row.from}</TableCell>
                  <TableCell>{row.to}</TableCell>
                  <TableCell className="tabular-nums">{row.total}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.cancelled}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {row.total - row.cancelled}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function Gstr1Sections({ report }: { report: Gstr1Report | undefined }) {
  const b2cs = report?.b2cs ?? []
  return (
    <>
      <DocumentSection
        documentLabel="Invoice"
        emptyLabel="No B2B invoices in period."
        lines={report?.b2b ?? []}
        showParty
        title="4A · B2B invoices"
      />
      <DocumentSection
        documentLabel="Invoice"
        emptyLabel="No B2C large invoices in period."
        lines={report?.b2cl ?? []}
        showParty={false}
        title="5 · B2C large invoices"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">7 · B2C others</CardTitle>
          <CardDescription>{sectionTotals(b2cs)}</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Place of supply</TableHead>
                <TaxHeads />
              </TableRow>
            </TableHeader>
            <TableBody>
              {b2cs.length === 0 ? (
                <EmptyRow colSpan={6} label="No B2C sales in period." />
              ) : (
                b2cs.map((row) => (
                  <TableRow
                    key={`${row.placeOfSupply}-${row.supplyType}-${row.gstRate}`}
                  >
                    <TableCell className="font-medium">
                      {stateLabel(row.placeOfSupply)}
                    </TableCell>
                    <TaxCells row={row} />
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <DocumentSection
        documentLabel="Credit note"
        emptyLabel="No credit notes to registered customers in period."
        lines={report?.cdnr ?? []}
        showParty
        title="9B · Credit notes (registered)"
      />
      <DocumentSection
        documentLabel="Credit note"
        emptyLabel="No credit notes against B2C large invoices in period."
        lines={report?.cdnur ?? []}
        showParty={false}
        title="9B · Credit notes (unregistered)"
      />
      <HsnSection
        emptyLabel="No sales to registered customers in period."
        rows={report?.hsnB2b ?? []}
        title="12 · HSN summary (B2B)"
      />
      <HsnSection
        emptyLabel="No sales to unregistered customers in period."
        rows={report?.hsnB2c ?? []}
        title="12 · HSN summary (B2C)"
      />
      <DocumentsIssuedSection series={report?.documentsIssued ?? []} />
    </>
  )
}
