import { cn } from '#/lib/utils.ts'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { stateLabel } from '#/features/documents/gst-invoice-format.ts'

import type { VoucherPrintDocument } from '#/features/documents/voucher-print-types.ts'

type VoucherDocumentPaperProps = {
  document: VoucherPrintDocument
  printId?: string
  className?: string
}

function companyAddressLines(
  company: VoucherPrintDocument['company'],
): Array<string> {
  const cityLine = [company.city, company.pincode].filter(Boolean).join(' - ')
  return [company.addressLine1, company.addressLine2, cityLine].filter(
    (line): line is string => Boolean(line && line.trim()),
  )
}

export function VoucherDocumentPaper({
  document,
  printId = 'voucher-print-root',
  className,
}: VoucherDocumentPaperProps) {
  const { company, party, isInterState } = document
  const addressLines = companyAddressLines(company)

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-4 rounded-lg border bg-white p-6 text-[13px] leading-tight text-black shadow-sm sm:p-8 print:border print:shadow-none',
        className,
      )}
      id={printId}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {document.title}
        </p>
        <p className="rounded border px-2 py-0.5 text-[11px] font-medium">
          {document.copyLabel}
        </p>
      </div>

      <div className="flex flex-col gap-4 border-y py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {company.logoUrl ? (
            <img
              alt=""
              className="size-14 shrink-0 rounded object-contain"
              src={company.logoUrl}
            />
          ) : null}
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-semibold">{company.legalName}</h1>
            {company.tradeName && company.tradeName !== company.legalName ? (
              <p className="text-muted-foreground">{company.tradeName}</p>
            ) : null}
            {addressLines.map((line) => (
              <p className="text-muted-foreground" key={line}>
                {line}
              </p>
            ))}
            <p className="text-muted-foreground">
              GSTIN: {company.gstin ?? 'Unregistered'}
              {company.pan ? ` · PAN: ${company.pan}` : ''}
            </p>
            <p className="text-muted-foreground">
              State: {stateLabel(company.stateCode) || company.stateCode}
            </p>
            {company.contactPhone || company.contactEmail ? (
              <p className="text-muted-foreground">
                {[company.contactPhone, company.contactEmail]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-left sm:text-right">
          <span className="text-muted-foreground">Invoice No</span>
          <span className="font-medium">{document.documentNumber}</span>
          <span className="text-muted-foreground">Date</span>
          <span className="font-medium">{document.documentDate}</span>
          {document.dueDate ? (
            <>
              <span className="text-muted-foreground">Due date</span>
              <span className="font-medium">{document.dueDate}</span>
            </>
          ) : null}
          {document.poReference ? (
            <>
              <span className="text-muted-foreground">PO / Ref</span>
              <span className="font-medium">{document.poReference}</span>
            </>
          ) : null}
          {document.challanRef ? (
            <>
              <span className="text-muted-foreground">Challan</span>
              <span className="font-medium">{document.challanRef}</span>
            </>
          ) : null}
          <span className="text-muted-foreground">Place of supply</span>
          <span className="font-medium">
            {document.placeOfSupplyLabel || '—'}
          </span>
          <span className="text-muted-foreground">Reverse charge</span>
          <span className="font-medium">
            {document.reverseCharge ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 border-b pb-4 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {document.partyLabel}
          </p>
          <p className="font-medium">{party.name}</p>
          {party.billingAddress ? (
            <p className="whitespace-pre-line text-muted-foreground">
              {party.billingAddress}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            GSTIN: {party.gstin ?? 'Unregistered'}
            {party.pan ? ` · PAN: ${party.pan}` : ''}
          </p>
          <p className="text-muted-foreground">
            State: {stateLabel(party.stateCode) || party.stateCode}
          </p>
          {party.contactPhone || party.contactEmail ? (
            <p className="text-muted-foreground">
              {[party.contactPhone, party.contactEmail].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Shipped to
          </p>
          <p className="font-medium">{party.name}</p>
          <p className="whitespace-pre-line text-muted-foreground">
            {party.shippingAddress || party.billingAddress || '—'}
          </p>
        </div>
      </div>

      {document.transportMode ||
      document.vehicleNo ||
      document.lrNumber ? (
        <div className="grid gap-2 border-b pb-4 text-xs sm:grid-cols-4">
          {document.transportMode ? (
            <div>
              <span className="text-muted-foreground">Transport </span>
              <span className="font-medium">{document.transportMode}</span>
            </div>
          ) : null}
          {document.vehicleNo ? (
            <div>
              <span className="text-muted-foreground">Vehicle </span>
              <span className="font-medium">{document.vehicleNo}</span>
            </div>
          ) : null}
          {document.lrNumber ? (
            <div>
              <span className="text-muted-foreground">LR / AWB </span>
              <span className="font-medium">{document.lrNumber}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-y bg-muted/40 uppercase text-muted-foreground">
              <th className="p-2">#</th>
              <th className="p-2">Description</th>
              <th className="p-2">HSN/SAC</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-right">Rate</th>
              <th className="p-2 text-right">Disc</th>
              <th className="p-2 text-right">Taxable</th>
              {isInterState ? (
                <>
                  <th className="p-2 text-right">IGST %</th>
                  <th className="p-2 text-right">IGST Amt</th>
                </>
              ) : (
                <>
                  <th className="p-2 text-right">CGST %</th>
                  <th className="p-2 text-right">CGST Amt</th>
                  <th className="p-2 text-right">SGST %</th>
                  <th className="p-2 text-right">SGST Amt</th>
                </>
              )}
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {document.lines.map((line) => (
              <tr className="border-b align-top" key={line.serial}>
                <td className="p-2">{line.serial}</td>
                <td className="p-2">{line.description}</td>
                <td className="p-2 font-mono">{line.hsnCode || '—'}</td>
                <td className="p-2 text-right">
                  {line.quantity} {line.unit}
                </td>
                <td className="p-2 text-right">{formatInr(line.rate)}</td>
                <td className="p-2 text-right">
                  {Number(line.discountAmount) > 0
                    ? formatInr(line.discountAmount)
                    : '—'}
                </td>
                <td className="p-2 text-right">
                  {formatInr(line.taxableAmount)}
                </td>
                {isInterState ? (
                  <>
                    <td className="p-2 text-right">{line.igstRate}%</td>
                    <td className="p-2 text-right">
                      {formatInr(line.igstAmount)}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 text-right">{line.cgstRate}%</td>
                    <td className="p-2 text-right">
                      {formatInr(line.cgstAmount)}
                    </td>
                    <td className="p-2 text-right">{line.sgstRate}%</td>
                    <td className="p-2 text-right">
                      {formatInr(line.sgstAmount)}
                    </td>
                  </>
                )}
                <td className="p-2 text-right">{formatInr(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-b font-medium">
              <td className="p-2" colSpan={6}>
                Total
              </td>
              <td className="p-2 text-right">
                {formatInr(document.taxableAmount)}
              </td>
              {isInterState ? (
                <>
                  <td className="p-2" />
                  <td className="p-2 text-right">
                    {formatInr(document.totalIgst)}
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2" />
                  <td className="p-2 text-right">
                    {formatInr(document.totalCgst)}
                  </td>
                  <td className="p-2" />
                  <td className="p-2 text-right">
                    {formatInr(document.totalSgst)}
                  </td>
                </>
              )}
              <td className="p-2 text-right">
                {formatInr(document.totalAmount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="overflow-x-auto">
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            HSN / tax summary
          </p>
          <table className="min-w-[320px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-y uppercase text-muted-foreground">
                <th className="p-2">HSN/SAC</th>
                <th className="p-2 text-right">Taxable</th>
                {isInterState ? (
                  <th className="p-2 text-right">IGST</th>
                ) : (
                  <>
                    <th className="p-2 text-right">CGST</th>
                    <th className="p-2 text-right">SGST</th>
                  </>
                )}
                <th className="p-2 text-right">Total tax</th>
              </tr>
            </thead>
            <tbody>
              {document.hsnSummary.map((row) => (
                <tr className="border-b" key={row.hsnCode}>
                  <td className="p-2 font-mono">{row.hsnCode}</td>
                  <td className="p-2 text-right">
                    {formatInr(row.taxableAmount)}
                  </td>
                  {isInterState ? (
                    <td className="p-2 text-right">
                      {formatInr(row.igstAmount)}
                    </td>
                  ) : (
                    <>
                      <td className="p-2 text-right">
                        {formatInr(row.cgstAmount)}
                      </td>
                      <td className="p-2 text-right">
                        {formatInr(row.sgstAmount)}
                      </td>
                    </>
                  )}
                  <td className="p-2 text-right">{formatInr(row.totalTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-1 text-right sm:min-w-[240px]">
          <div className="flex justify-between gap-8">
            <span className="text-muted-foreground">Taxable</span>
            <span>{formatInr(document.taxableAmount)}</span>
          </div>
          {isInterState ? (
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">IGST</span>
              <span>{formatInr(document.totalIgst)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatInr(document.totalCgst)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatInr(document.totalSgst)}</span>
              </div>
            </>
          )}
          {Number(document.freight) > 0 ? (
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Freight</span>
              <span>{formatInr(document.freight)}</span>
            </div>
          ) : null}
          {Number(document.packing) > 0 ? (
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Packing</span>
              <span>{formatInr(document.packing)}</span>
            </div>
          ) : null}
          {Number(document.billDiscount) > 0 ? (
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Bill discount</span>
              <span>-{formatInr(document.billDiscount)}</span>
            </div>
          ) : null}
          {Number(document.roundOff) !== 0 ? (
            <div className="flex justify-between gap-8">
              <span className="text-muted-foreground">Round off</span>
              <span>{formatInr(document.roundOff)}</span>
            </div>
          ) : null}
          <div className="flex justify-between gap-8 border-t pt-1 text-base font-semibold">
            <span>Grand total</span>
            <span>{formatInr(document.totalAmount)}</span>
          </div>
          <div className="flex justify-between gap-8 text-muted-foreground">
            <span>Outstanding</span>
            <span>{formatInr(document.outstandingAmount)}</span>
          </div>
        </div>
      </div>

      <p className="border-y py-2 text-xs">
        <span className="text-muted-foreground">Amount in words: </span>
        <span className="font-medium">{document.amountInWords}</span>
      </p>

      {document.eInvoice ? (
        <div className="flex flex-col gap-1 rounded border p-3 text-xs">
          <p className="font-medium">e-Invoice</p>
          <p className="break-all text-muted-foreground">
            IRN: {document.eInvoice.irn}
          </p>
          <p className="text-muted-foreground">
            Ack No: {document.eInvoice.ackNumber} · {document.eInvoice.ackDate}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1 text-xs">
          {company.bankName ? (
            <>
              <p className="font-medium uppercase text-muted-foreground">
                Bank details
              </p>
              <p>{company.bankName}</p>
              {company.bankAccountNumber ? (
                <p>A/C: {company.bankAccountNumber}</p>
              ) : null}
              {company.bankIfsc ? <p>IFSC: {company.bankIfsc}</p> : null}
            </>
          ) : null}
          {document.narration ? (
            <p className="mt-2 text-muted-foreground">{document.narration}</p>
          ) : null}
          <p className="mt-2 whitespace-pre-line text-muted-foreground">
            {company.invoiceTerms?.trim()
              ? company.invoiceTerms
              : 'Goods once sold will not be taken back. Interest at 18% p.a. is charged on overdue bills. Subject to local jurisdiction.'}
          </p>
        </div>
        <div className="flex flex-col justify-end gap-8 text-right text-xs">
          <p className="font-medium">For {company.legalName}</p>
          <p className="border-t pt-1 text-muted-foreground">
            {company.authorizedSignatory
              ? `${company.authorizedSignatory} · Authorised Signatory`
              : 'Authorised Signatory'}
          </p>
        </div>
      </div>
    </div>
  )
}
