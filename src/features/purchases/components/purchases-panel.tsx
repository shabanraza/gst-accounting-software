import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { EyeIcon, PlusIcon, PrinterIcon, SearchIcon, TruckIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip.tsx'
import { VoucherPreviewSheet } from '#/features/documents/components/voucher-preview-sheet.tsx'
import type { VoucherPreviewTarget } from '#/features/documents/components/voucher-preview-sheet.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function PurchasesPanel() {
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<
    'all' | 'Paid' | 'Part paid' | 'Pending'
  >('all')
  const [previewTarget, setPreviewTarget] =
    React.useState<VoucherPreviewTarget | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)

  const purchasesQuery = useQuery({
    ...trpc.purchases.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const partyName = React.useMemo(() => {
    const map = new Map(
      (partiesQuery.data ?? []).map((party) => [party.id, party.name]),
    )
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [partiesQuery.data])

  const rows = purchasesQuery.data ?? []
  const filtered = rows.filter((row) => {
    const matchesFilter = filter === 'all' || row.paymentStatus === filter
    const haystack =
      `${row.supplierBillNumber} ${partyName(row.supplierId)}`.toLowerCase()
    return matchesFilter && haystack.includes(query.trim().toLowerCase())
  })

  function openPreview(row: { id: string; supplierBillNumber: string }) {
    setPreviewTarget({
      kind: 'purchase',
      id: row.id,
      number: row.supplierBillNumber,
    })
    setPreviewOpen(true)
  }

  return (
    <WorkspacePage
      actions={
        <Button asChild>
          <Link to="/app/purchases/new">
            <PlusIcon data-icon="inline-start" />
            New purchase bill
          </Link>
        </Button>
      }
      description="Purchase register from posted supplier bills."
      title="Purchases"
    >
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <TruckIcon className="size-4 text-muted-foreground" />
              Purchase bills
            </CardTitle>
            <CardDescription>{filtered.length} posted vouchers</CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              onValueChange={(value) =>
                setFilter(value as 'all' | 'Paid' | 'Part paid' | 'Pending')
              }
              value={filter}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Pending">Pending</TabsTrigger>
                <TabsTrigger value="Part paid">Part paid</TabsTrigger>
                <TabsTrigger value="Paid">Paid</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search bill or supplier"
                value={query}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier bill</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Taxable</TableHead>
                <TableHead>Tax</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchasesQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={9}
                  >
                    Loading purchases…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={9}
                  >
                    No purchases yet. Create a purchase voucher.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.supplierBillNumber}
                    </TableCell>
                    <TableCell>{partyName(row.supplierId)}</TableCell>
                    <TableCell>{row.billDate}</TableCell>
                    <TableCell>{row.dueDate}</TableCell>
                    <TableCell>{formatInr(row.taxableAmount)}</TableCell>
                    <TableCell>{formatInr(row.totalGstAmount)}</TableCell>
                    <TableCell>{formatInr(row.totalAmount)}</TableCell>
                    <TableCell>
                      {row.paymentStatus === 'Paid' ? (
                        <Badge variant="success">Paid</Badge>
                      ) : row.paymentStatus === 'Part paid' ? (
                        <Badge variant="warning">Part paid</Badge>
                      ) : (
                        <Badge variant="info">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => openPreview(row)}
                              size="icon-sm"
                              type="button"
                              variant="ghost"
                            >
                              <EyeIcon />
                              <span className="sr-only">Preview bill</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button asChild size="icon-sm" variant="ghost">
                              <Link
                                params={{ billId: row.id }}
                                to="/app/purchases/$billId/print"
                              >
                                <PrinterIcon />
                                <span className="sr-only">Print bill</span>
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Print</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VoucherPreviewSheet
        onOpenChange={setPreviewOpen}
        open={previewOpen}
        target={previewTarget}
      />
    </WorkspacePage>
  )
}
