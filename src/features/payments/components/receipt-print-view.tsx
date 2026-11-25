import * as React from 'react'
import { skipToken, useQuery } from '@tanstack/react-query'

import { VoucherPrintToolbar } from '#/features/documents/components/voucher-print-toolbar.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  amountInWords,
  formatIndianDate,
} from '#/features/documents/gst-invoice-format.ts'
import { MODE_LABELS } from '#/features/payments/components/payment-voucher-sheet.tsx'
import { formatInr } from '#/lib/format-inr.ts'
import { cn } from '#/lib/utils.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

const cell = 'border border-black p-1.5 align-top text-[11px] text-black'
const headCell =
  'border border-black bg-neutral-100 p-1.5 text-left text-[10px] font-semibold uppercase text-black'

export function ReceiptPrintView({
  voucherId,
  autoprint,
}: {
  voucherId: string
  autoprint?: boolean
}) {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()
  const enabled = Boolean(companyId && isReady)

  const voucherQuery = useQuery(
    trpc.payments.getById.queryOptions(
      enabled && companyId ? { companyId, id: voucherId } : skipToken,
    ),
  )
  const partiesQuery = useQuery(
    trpc.parties.list.queryOptions(
      enabled && companyId ? { companyId } : skipToken,
    ),
  )
  const accountsQuery = useQuery(
    trpc.accounting.listLedgerAccounts.queryOptions(
      enabled && companyId ? { companyId } : skipToken,
    ),
  )

  const voucher = voucherQuery.data
  const party = (partiesQuery.data ?? []).find(
    (row) => row.id === voucher?.partyId,
  )
  const account = (accountsQuery.data ?? []).find(
    (row) => row.id === voucher?.cashBankAccountId,
  )
  const ready = Boolean(voucher && company && party)

  React.useEffect(() => {
    if (autoprint && ready) {
      const timer = window.setTimeout(() => window.print(), 300)
      return () => window.clearTimeout(timer)
    }
  }, [autoprint, ready])

  if (voucherQuery.isError) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Voucher not found.
      </div>
    )
  }

  if (!voucher || !company || !party) {
    return (
      <div className="p-8 text-sm text-muted-foreground">Loading voucher…</div>
    )
  }

  const isReceipt = voucher.kind === 'receipt'
  const cancelled = voucher.status === 'cancelled'
  const fullPageHref = `/app/payments/${voucherId}/print`
  const addressLines = [
    company.addressLine1,
    company.addressLine2,
    [company.city, company.pincode].filter(Boolean).join(' - '),
  ].filter((line) => line && line.trim())
  const modeText = [
    MODE_LABELS[voucher.mode],
    voucher.reference
      ? `${voucher.mode === 'cheque' ? 'cheque no.' : 'ref.'} ${voucher.reference}`
      : '',
    account ? `(${account.name})` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="mx-auto min-h-screen max-w-3xl p-4 sm:p-6 print:max-w-none print:p-0">
      <VoucherPrintToolbar
        className="mb-4"
        fullPageHref={fullPageHref}
        pdfHref={`${fullPageHref}?autoprint=1`}
      />
      <div
        className="relative mx-auto w-full max-w-[210mm] overflow-x-auto bg-white p-4 text-[11px] text-black print:p-0"
        id="voucher-print-root"
      >
        {cancelled ? (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-bold uppercase tracking-widest text-neutral-300">
            Cancelled
          </p>
        ) : null}
        <div className="flex flex-col gap-1 border-b border-black pb-2 text-center">
          <p className="text-base font-bold">{company.legalName}</p>
          {addressLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {company.gstin ? <p>GSTIN: {company.gstin}</p> : null}
        </div>
        <p className="py-2 text-center text-sm font-bold uppercase tracking-wide">
          {isReceipt ? 'Receipt voucher' : 'Payment voucher'}
        </p>
        <div className="flex flex-wrap justify-between gap-2 pb-3">
          <p>
            No.:{' '}
            <span className="font-mono font-semibold">
              {voucher.voucherNumber}
            </span>
          </p>
          <p>Date: {formatIndianDate(voucher.voucherDate)}</p>
        </div>
        <p className="pb-3 leading-relaxed">
          {isReceipt ? 'Received with thanks from' : 'Paid to'}{' '}
          <span className="font-semibold">M/s {party.name}</span>
          {party.gstin ? ` (GSTIN ${party.gstin})` : ''} the sum of{' '}
          <span className="font-semibold">{amountInWords(voucher.amount)}</span>{' '}
          by {modeText}.
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={headCell}>Particulars</th>
              <th className={cn(headCell, 'text-right')}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {voucher.allocations.map((allocation) => (
              <tr key={allocation.id}>
                <td className={cell}>
                  Against {isReceipt ? 'invoice' : 'bill'}{' '}
                  {allocation.documentNumber}
                </td>
                <td className={cn(cell, 'text-right font-mono tabular-nums')}>
                  {formatInr(allocation.amount)}
                </td>
              </tr>
            ))}
            {Number(voucher.unallocatedAmount) > 0 ? (
              <tr>
                <td className={cell}>On account (advance)</td>
                <td className={cn(cell, 'text-right font-mono tabular-nums')}>
                  {formatInr(voucher.unallocatedAmount)}
                </td>
              </tr>
            ) : null}
            <tr>
              <td className={cn(cell, 'font-semibold')}>Total</td>
              <td
                className={cn(
                  cell,
                  'text-right font-mono font-semibold tabular-nums',
                )}
              >
                {formatInr(voucher.amount)}
              </td>
            </tr>
          </tbody>
        </table>
        {voucher.narration ? (
          <p className="pt-3">Narration: {voucher.narration}</p>
        ) : null}
        <div className="flex justify-between gap-4 pt-12">
          <p className="border-t border-black pt-1">
            {isReceipt ? "Payer's signature" : "Receiver's signature"}
          </p>
          <p className="border-t border-black pt-1 text-right">
            For {company.legalName}
            <br />
            Authorised signatory
          </p>
        </div>
      </div>
    </div>
  )
}
