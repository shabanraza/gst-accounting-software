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
import { formatInr } from '#/lib/format-inr.ts'

import type { Gstr3bReport } from '#/features/gst/gstr3b-report-service.ts'

/** GSTR-3B tables 3.1 and 4 as the GST portal lays them out. */
export function Gstr3bSections({
  report,
}: {
  report: Gstr3bReport | undefined
}) {
  const outward = report?.outwardTaxableSupplies
  const itc = report?.eligibleItc

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            3.1 Outward supplies and inward supplies liable to reverse charge
          </CardTitle>
          <CardDescription>Net of credit notes</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nature of supplies</TableHead>
                <TableHead>Taxable value</TableHead>
                <TableHead>IGST</TableHead>
                <TableHead>CGST</TableHead>
                <TableHead>SGST/UTGST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="min-w-40 whitespace-normal">
                  (a) Outward taxable supplies (other than zero rated, nil rated
                  and exempted)
                </TableCell>
                <TableCell>{formatInr(outward?.taxableValue ?? 0)}</TableCell>
                <TableCell>{formatInr(outward?.igst ?? 0)}</TableCell>
                <TableCell>{formatInr(outward?.cgst ?? 0)}</TableCell>
                <TableCell>{formatInr(outward?.sgst ?? 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4 Eligible ITC</CardTitle>
          <CardDescription>
            From purchase bills, net of debit notes
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Details</TableHead>
                <TableHead>IGST</TableHead>
                <TableHead>CGST</TableHead>
                <TableHead>SGST/UTGST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>(A)(5) All other ITC</TableCell>
                <TableCell>{formatInr(itc?.igst ?? 0)}</TableCell>
                <TableCell>{formatInr(itc?.cgst ?? 0)}</TableCell>
                <TableCell>{formatInr(itc?.sgst ?? 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
