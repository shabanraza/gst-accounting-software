import { skipToken, useQuery } from '@tanstack/react-query'
import { HistoryIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
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
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { formatInr } from '#/lib/format-inr.ts'

const actionLabels: Record<string, string> = {
  'company.created': 'Company created',
  'sales_invoice.posted': 'Sales invoice saved',
  'sales_invoice.cancelled': 'Sales invoice cancelled',
  'purchase_bill.posted': 'Purchase bill saved',
  'scanned_bill.confirmed': 'Scanned bill confirmed',
  'receipt.posted': 'Receipt recorded',
  'payment.posted': 'Payment recorded',
  'credit_note.posted': 'Credit note (sales return)',
  'debit_note.posted': 'Debit note (purchase return)',
  'expense.posted': 'Expense recorded',
  'journal_voucher.posted': 'Journal voucher',
  'contra_voucher.posted': 'Contra voucher',
  'payment_voucher.posted': 'Payment voucher',
  'receipt_voucher.posted': 'Receipt voucher',
  'sales_voucher.posted': 'Sales voucher',
  'purchase_voucher.posted': 'Purchase voucher',
}

function metadataText(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key]
  return typeof value === 'string' ? value : ''
}

export function AuditLogViewer() {
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()

  const auditQuery = useQuery(
    trpc.audit.list.queryOptions(
      companyId && isReady ? { companyId } : skipToken,
    ),
  )

  const events = auditQuery.data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HistoryIcon className="size-4 text-muted-foreground" />
          Audit log
        </CardTitle>
        <CardDescription>
          Who saved or cancelled each document, and when.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={5}
                >
                  No audit events recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => {
                const documentNumber =
                  metadataText(event.metadata, 'documentNumber') ||
                  metadataText(event.metadata, 'tradeName')
                const amount = metadataText(event.metadata, 'amount')
                return (
                  <TableRow key={event.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {event.actorName || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          event.action.endsWith('.cancelled')
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {actionLabels[event.action] ?? event.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-medium">
                      {documentNumber || '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {amount ? formatInr(amount) : '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
