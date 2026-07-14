import { cn } from '#/lib/utils.ts'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import {
  formatIndianDate,
  stateLabel,
} from '#/features/documents/gst-invoice-format.ts'

import type { VoucherPrintDocument } from '#/features/documents/voucher-print-types.ts'

type VoucherDocumentPaperProps = {
  document: VoucherPrintDocument
  printId?: string
  className?: string
}

const cell =
  'border border-black p-1 align-top text-[11px] leading-snug text-black'
const headCell =
  'border border-black bg-neutral-100 p-1 text-[10px] font-semibold uppercase leading-snug text-black'
const numCell = cn(cell, 'text-right tabular-nums')

function companyAddressLines(
  company: VoucherPrintDocument['company'],
): Array<string> {
  const cityLine = [company.city, company.pincode].filter(Boolean).join(' - ')
  return [company.addressLine1, company.addressLine2, cityLine].filter(
    (line): line is string => Boolean(line && line.trim()),
  )
}

function PartyAddressBlock({
  title,
  name,
  address,
  gstin,
  pan,
  stateCode,
  phone,
  email,
}: {
  title: string
  name: string
  address?: string
  gstin: string | null
  pan?: string
  stateCode: string
  phone?: string
  email?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] font-semibold uppercase">{title}</p>
      <p className="font-semibold">M/s {name}</p>
      {address ? (
        <p className="whitespace-pre-line">{address}</p>
      ) : (
        <p className="italic text-neutral-600">Address not recorded</p>
      )}
      <p>
        GSTIN/UIN: {gstin ?? 'Unregistered'}
        {pan ? ` · PAN: ${pan}` : ''}
      </p>
      <p>State: {stateLabel(stateCode) || stateCode}</p>
      {phone || email ? (
        <p>{[phone, email].filter(Boolean).join(' · ')}</p>
      ) : null}
    </div>
  )
}

export function VoucherDocumentPaper({
  document,
  printId = 'voucher-print-root',
  className,
}: VoucherDocumentPaperProps) {
  const { company, party, isInterState } = document
  const cols = isInterState ? 12 : 14
  const addressLines = companyAddressLines(company)
  const shipAddress = party.shippingAddress || party.billingAddress || ''

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[210mm] bg-white p-2 text-black print:p-0',
        className,
      )}
      id={printId}
    >
      <table className="w-full border-collapse border border-black text-[11px]">
        <tbody>
          <tr>
            <td className={cell} colSpan={cols}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {company.logoUrl ? (
                    <img
                      alt=""
                      className="size-12 shrink-0 object-contain"
                      src={company.logoUrl}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-sm font-bold uppercase">{company.legalName}</p>
                    {company.tradeName &&
                    company.tradeName !== company.legalName ? (
                      <p className="text-[10px]">{company.tradeName}</p>
                    ) : null}
                    {addressLines.length > 0 ? (
                      addressLines.map((line) => <p key={line}>{line}</p>)
                    ) : (
                      <p className="italic text-neutral-600">
                        Company address not recorded
                      </p>
                    )}
                    <p>
                      GSTIN/UIN: {company.gstin ?? 'Unregistered'}
                      {company.pan ? ` · PAN: ${company.pan}` : ''}
                    </p>
                    <p>State: {stateLabel(company.stateCode) || company.stateCode}</p>
                    {company.contactPhone || company.contactEmail ? (
                      <p>
                        {[company.contactPhone, company.contactEmail]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-bold uppercase tracking-wide">
                    {document.title}
                  </p>
                  <p className="mt-1 text-[10px] font-medium">{document.copyLabel}</p>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td className={headCell}>Invoice No.</td>
            <td className={cell} colSpan={2}>
              {document.documentNumber}
            </td>
            <td className={headCell}>Dated</td>
            <td className={cell} colSpan={isInterState ? 2 : 3}>
              {formatIndianDate(document.documentDate)}
            </td>
            <td className={headCell}>Due Date</td>
            <td className={cell} colSpan={isInterState ? 5 : 6}>
              {formatIndianDate(document.dueDate || document.documentDate)}
            </td>
          </tr>

          <tr>
            <td className={headCell}>Place of Supply</td>
            <td className={cell} colSpan={isInterState ? 2 : 3}>
              {document.placeOfSupplyLabel || '—'}
            </td>
            <td className={headCell}>Mode/Terms of Payment</td>
            <td className={cell} colSpan={isInterState ? 8 : 9}>
              {document.paymentMode
                ? document.paymentMode === 'cash'
                  ? 'Cash'
                  : 'Credit'
                : '—'}
            </td>
          </tr>

          {(document.poReference ||
            document.challanRef ||
            document.transportMode ||
            document.vehicleNo ||
            document.lrNumber) && (
            <tr>
              <td className={headCell}>References</td>
              <td className={cell} colSpan={cols - 1}>
                {[
                  document.poReference ? `PO/Ref: ${document.poReference}` : null,
                  document.challanRef ? `Challan: ${document.challanRef}` : null,
                  document.transportMode
                    ? `Transport: ${document.transportMode}`
                    : null,
                  document.vehicleNo ? `Vehicle: ${document.vehicleNo}` : null,
                  document.lrNumber ? `LR/AWB: ${document.lrNumber}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </td>
            </tr>
          )}

          <tr>
            <td className={cell} colSpan={Math.floor(cols / 2)}>
              <PartyAddressBlock
                address={party.billingAddress}
                email={party.contactEmail}
                gstin={party.gstin}
                name={party.name}
                pan={party.pan}
                phone={party.contactPhone}
                stateCode={party.stateCode}
                title={document.partyLabel}
              />
            </td>
            <td className={cell} colSpan={cols - Math.floor(cols / 2)}>
              <PartyAddressBlock
                address={shipAddress}
                email={party.contactEmail}
                gstin={party.gstin}
                name={party.name}
                pan={party.pan}
                phone={party.contactPhone}
                stateCode={party.stateCode}
                title="Shipped to"
              />
            </td>
          </tr>

          <tr>
            <td className={headCell}>Sr</td>
            <td className={headCell} colSpan={2}>
              Description of Goods
            </td>
            <td className={headCell}>HSN/SAC</td>
            <td className={cn(headCell, 'text-right')}>Qty</td>
            <td className={headCell}>Unit</td>
            <td className={cn(headCell, 'text-right')}>Rate</td>
            <td className={cn(headCell, 'text-right')}>Disc</td>
            <td className={cn(headCell, 'text-right')}>Taxable</td>
            {isInterState ? (
              <>
                <td className={cn(headCell, 'text-right')}>IGST %</td>
                <td className={cn(headCell, 'text-right')}>IGST Amt</td>
              </>
            ) : (
              <>
                <td className={cn(headCell, 'text-right')}>CGST %</td>
                <td className={cn(headCell, 'text-right')}>CGST Amt</td>
                <td className={cn(headCell, 'text-right')}>SGST %</td>
                <td className={cn(headCell, 'text-right')}>SGST Amt</td>
              </>
            )}
            <td className={cn(headCell, 'text-right')}>Amount</td>
          </tr>

          {document.lines.map((line) => (
            <tr key={line.serial}>
              <td className={cn(cell, 'text-center')}>{line.serial}</td>
              <td className={cell} colSpan={2}>
                {line.description}
              </td>
              <td className={cn(cell, 'font-mono')}>{line.hsnCode || '—'}</td>
              <td className={numCell}>{line.quantity}</td>
              <td className={cell}>{line.unit}</td>
              <td className={numCell}>{formatInr(line.rate)}</td>
              <td className={numCell}>
                {Number(line.discountAmount) > 0
                  ? formatInr(line.discountAmount)
                  : '—'}
              </td>
              <td className={numCell}>{formatInr(line.taxableAmount)}</td>
              {isInterState ? (
                <>
                  <td className={numCell}>{line.igstRate}%</td>
                  <td className={numCell}>{formatInr(line.igstAmount)}</td>
                </>
              ) : (
                <>
                  <td className={numCell}>{line.cgstRate}%</td>
                  <td className={numCell}>{formatInr(line.cgstAmount)}</td>
                  <td className={numCell}>{line.sgstRate}%</td>
                  <td className={numCell}>{formatInr(line.sgstAmount)}</td>
                </>
              )}
              <td className={numCell}>{formatInr(line.lineTotal)}</td>
            </tr>
          ))}

          <tr className="font-semibold">
            <td className={cell} colSpan={isInterState ? 8 : 8}>
              Total
            </td>
            <td className={numCell}>{formatInr(document.taxableAmount)}</td>
            {isInterState ? (
              <>
                <td className={cell} />
                <td className={numCell}>{formatInr(document.totalIgst)}</td>
              </>
            ) : (
              <>
                <td className={cell} />
                <td className={numCell}>{formatInr(document.totalCgst)}</td>
                <td className={cell} />
                <td className={numCell}>{formatInr(document.totalSgst)}</td>
              </>
            )}
            <td className={numCell}>{formatInr(document.totalAmount)}</td>
          </tr>

          <tr>
            <td className={cell} colSpan={isInterState ? 6 : 7}>
              <p className="mb-1 text-[10px] font-semibold uppercase">
                HSN/SAC Summary
              </p>
              <table className="w-full border-collapse border border-black text-[10px]">
                <thead>
                  <tr>
                    <td className={headCell}>HSN/SAC</td>
                    <td className={cn(headCell, 'text-right')}>Taxable Value</td>
                    {isInterState ? (
                      <td className={cn(headCell, 'text-right')}>IGST</td>
                    ) : (
                      <>
                        <td className={cn(headCell, 'text-right')}>CGST</td>
                        <td className={cn(headCell, 'text-right')}>SGST</td>
                      </>
                    )}
                    <td className={cn(headCell, 'text-right')}>Total Tax</td>
                  </tr>
                </thead>
                <tbody>
                  {document.hsnSummary.map((row) => (
                    <tr key={row.hsnCode}>
                      <td className={cell}>{row.hsnCode}</td>
                      <td className={numCell}>{formatInr(row.taxableAmount)}</td>
                      {isInterState ? (
                        <td className={numCell}>{formatInr(row.igstAmount)}</td>
                      ) : (
                        <>
                          <td className={numCell}>{formatInr(row.cgstAmount)}</td>
                          <td className={numCell}>{formatInr(row.sgstAmount)}</td>
                        </>
                      )}
                      <td className={numCell}>{formatInr(row.totalTax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2">
                <span className="font-semibold">Amount Chargeable (in words): </span>
                {document.amountInWords}
              </p>
              {document.narration ? (
                <p className="mt-1">
                  <span className="font-semibold">Narration: </span>
                  {document.narration}
                </p>
              ) : null}
            </td>
            <td className={cell} colSpan={cols - (isInterState ? 6 : 7)}>
              <table className="w-full text-[11px]">
                <tbody>
                  <tr>
                    <td className="py-0.5">Taxable Amount</td>
                    <td className="py-0.5 text-right tabular-nums">
                      {formatInr(document.taxableAmount)}
                    </td>
                  </tr>
                  {isInterState ? (
                    <tr>
                      <td className="py-0.5">IGST</td>
                      <td className="py-0.5 text-right tabular-nums">
                        {formatInr(document.totalIgst)}
                      </td>
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <td className="py-0.5">CGST</td>
                        <td className="py-0.5 text-right tabular-nums">
                          {formatInr(document.totalCgst)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-0.5">SGST</td>
                        <td className="py-0.5 text-right tabular-nums">
                          {formatInr(document.totalSgst)}
                        </td>
                      </tr>
                    </>
                  )}
                  {Number(document.freight) > 0 ? (
                    <tr>
                      <td className="py-0.5">Freight</td>
                      <td className="py-0.5 text-right tabular-nums">
                        {formatInr(document.freight)}
                      </td>
                    </tr>
                  ) : null}
                  {Number(document.packing) > 0 ? (
                    <tr>
                      <td className="py-0.5">Packing</td>
                      <td className="py-0.5 text-right tabular-nums">
                        {formatInr(document.packing)}
                      </td>
                    </tr>
                  ) : null}
                  {Number(document.billDiscount) > 0 ? (
                    <tr>
                      <td className="py-0.5">Bill Discount</td>
                      <td className="py-0.5 text-right tabular-nums">
                        -{formatInr(document.billDiscount)}
                      </td>
                    </tr>
                  ) : null}
                  {Number(document.roundOff) !== 0 ? (
                    <tr>
                      <td className="py-0.5">Round Off</td>
                      <td className="py-0.5 text-right tabular-nums">
                        {formatInr(document.roundOff)}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="border-t border-black font-bold">
                    <td className="pt-1">Grand Total</td>
                    <td className="pt-1 text-right tabular-nums">
                      {formatInr(document.totalAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-0.5">Outstanding</td>
                    <td className="py-0.5 text-right tabular-nums">
                      {formatInr(document.outstandingAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td className={cell} colSpan={isInterState ? 6 : 7}>
              {company.bankName ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase">
                    Company&apos;s Bank Details
                  </p>
                  <p>Bank: {company.bankName}</p>
                  {company.bankAccountNumber ? (
                    <p>A/c No.: {company.bankAccountNumber}</p>
                  ) : null}
                  {company.bankIfsc ? <p>IFSC: {company.bankIfsc}</p> : null}
                </div>
              ) : null}
              <p className="mt-2 whitespace-pre-line text-[10px]">
                {company.invoiceTerms?.trim() ||
                  "Goods once sold will not be taken back. Interest @18% p.a. on overdue bills. Subject to local jurisdiction. Whether tax is payable on reverse charge - No."}
              </p>
              <p className="mt-1 text-[10px]">
                Reverse Charge: {document.reverseCharge ? 'Yes' : 'No'}
              </p>
            </td>
            <td className={cn(cell, 'align-bottom text-right')} colSpan={cols - (isInterState ? 6 : 7)}>
              <p className="font-semibold">For {company.legalName}</p>
              <div className="mt-10 border-t border-black pt-1">
                {company.authorizedSignatory
                  ? `${company.authorizedSignatory} · Authorised Signatory`
                  : 'Authorised Signatory'}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
