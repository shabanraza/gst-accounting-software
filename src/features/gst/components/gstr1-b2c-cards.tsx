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
import { formatInr } from '#/lib/format-inr.ts'

import type {
  Gstr1B2csRow,
  Gstr1Line,
} from '#/features/gst/gstr1-report-service.ts'

function gstOf(row: { cgstAmount: string; sgstAmount: string; igstAmount: string }) {
  return Number(row.cgstAmount) + Number(row.sgstAmount) + Number(row.igstAmount)
}

export function Gstr1B2cCards({
  b2cl,
  b2cs,
}: {
  b2cl: Array<Gstr1Line>
  b2cs: Array<Gstr1B2csRow>
}) {
  return (
    <>
      {b2cl.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">B2C large invoices</CardTitle>
            <CardDescription>
              Other-state sales to unregistered customers above ₹1 lakh
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Place of supply</TableHead>
                  <TableHead>Taxable</TableHead>
                  <TableHead>IGST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b2cl.map((row) => (
                  <TableRow key={row.invoiceNumber}>
                    <TableCell className="font-medium">
                      {row.invoiceNumber}
                    </TableCell>
                    <TableCell>{row.partyName}</TableCell>
                    <TableCell>{stateLabel(row.placeOfSupply)}</TableCell>
                    <TableCell>{formatInr(row.taxableAmount)}</TableCell>
                    <TableCell>{formatInr(row.igstAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">B2C small</CardTitle>
          <CardDescription>
            Sales to unregistered customers by place of supply and GST rate
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Place of supply</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>Tax</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {b2cs.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={4}
                  >
                    No B2C sales in period.
                  </TableCell>
                </TableRow>
              ) : (
                b2cs.map((row) => (
                  <TableRow
                    key={`${row.placeOfSupply}-${row.supplyType}-${row.gstRate}`}
                  >
                    <TableCell className="font-medium">
                      {stateLabel(row.placeOfSupply)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {Number(row.gstRate)}%
                    </TableCell>
                    <TableCell>{formatInr(row.taxableAmount)}</TableCell>
                    <TableCell>{formatInr(gstOf(row))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
