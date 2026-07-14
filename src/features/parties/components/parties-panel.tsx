import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, UsersIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  paymentTermsOptions,
  stateLabel,
} from '#/features/app-shell/data/india-masters.ts'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { usePartiesList } from '#/features/masters/use-master-data.ts'
import { CreatePartyDialog } from '#/features/parties/components/create-party-dialog.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { partyTypeBadgeIntent } from '#/lib/badge-intent.ts'
import type {
  PartyRecord,
  PartyType,
} from '#/features/parties/party-service.ts'

function partyTypeBadge(partyType: PartyType) {
  const label =
    partyType === 'customer'
      ? 'Customer'
      : partyType === 'supplier'
        ? 'Supplier'
        : 'Both'
  return <Badge variant={partyTypeBadgeIntent(partyType)}>{label}</Badge>
}

export function PartiesPanel() {
  const trpc = useTRPC()
  const { companyId, isReady, error: workspaceError } = useWorkspace()
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | PartyType>('all')
  const [editParty, setEditParty] = React.useState<PartyRecord | null>(null)

  const partiesQuery = usePartiesList()
  const salesQuery = useQuery({
    ...trpc.sales.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const purchasesQuery = useQuery({
    ...trpc.purchases.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const priceListsQuery = useQuery({
    ...trpc.inventory.listPriceLists.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const priceListNameById = React.useMemo(() => {
    return new Map(
      (priceListsQuery.data ?? []).map((list) => [list.id, list.name]),
    )
  }, [priceListsQuery.data])

  const outstandingByPartyId = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const invoice of salesQuery.data ?? []) {
      map.set(
        invoice.customerId,
        (map.get(invoice.customerId) ?? 0) + Number(invoice.outstandingAmount),
      )
    }
    for (const bill of purchasesQuery.data ?? []) {
      map.set(
        bill.supplierId,
        (map.get(bill.supplierId) ?? 0) + Number(bill.outstandingAmount),
      )
    }
    return map
  }, [purchasesQuery.data, salesQuery.data])

  const parties = partiesQuery.data
  const filtered = parties.filter((party) => {
    const matchesFilter = filter === 'all' || party.partyType === filter
    const haystack =
      `${party.name} ${party.gstin ?? ''} ${party.stateCode}`.toLowerCase()
    return matchesFilter && haystack.includes(query.trim().toLowerCase())
  })

  return (
    <WorkspacePage
      actions={
        <CreatePartyDialog
          trigger={
            <Button>
              <PlusIcon data-icon="inline-start" />
              New party
            </Button>
          }
        />
      }
      description="GST billing address, PAN, and contact details for tax invoices."
      title="Customers & suppliers"
    >
      {workspaceError ? (
        <p className="text-sm text-destructive">{workspaceError}</p>
      ) : null}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersIcon className="size-4 text-muted-foreground" />
              Customer & supplier list
            </CardTitle>
            <CardDescription>
              {filtered.length} contacts · State drives CGST/SGST vs IGST
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              onValueChange={(value) => setFilter(value as 'all' | PartyType)}
              value={filter}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="customer">Customers</TabsTrigger>
                <TabsTrigger value="supplier">Suppliers</TabsTrigger>
                <TabsTrigger value="both">Both</TabsTrigger>
              </TabsList>
            </Tabs>
            <SearchInput
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or GSTIN"
              value={query}
              wrapperClassName="w-full max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>State</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Credit limit</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Price list</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {partiesQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={9}
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={9}
                  >
                    No customers or suppliers yet.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((party) => (
                  <TableRow key={party.id}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>{partyTypeBadge(party.partyType)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {party.gstin ?? 'Unregistered'}
                    </TableCell>
                    <TableCell className="truncate">
                      {stateLabel(party.stateCode)}
                    </TableCell>
                    <TableCell className="truncate">
                      {party.city || '—'}
                    </TableCell>
                    <TableCell>
                      {party.creditLimit
                        ? `₹${Number(party.creditLimit).toLocaleString('en-IN')}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {paymentTermsOptions.find(
                        (term) => term.days === party.paymentTermsDays,
                      )?.label ?? `${party.paymentTermsDays}d`}
                    </TableCell>
                    <TableCell className="truncate">
                      {party.priceListId
                        ? (priceListNameById.get(party.priceListId) ??
                          'Assigned')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInr(outstandingByPartyId.get(party.id) ?? 0)}
                    </TableCell>
                    <TableCell>
                      <Button
                        aria-label={`Edit ${party.name}`}
                        className="text-muted-foreground"
                        onClick={() => setEditParty(party)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <PencilIcon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CreatePartyDialog
        onOpenChange={(next) => {
          if (!next) setEditParty(null)
        }}
        open={Boolean(editParty)}
        party={editParty}
      />
    </WorkspacePage>
  )
}
