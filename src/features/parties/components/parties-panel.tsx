import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, SearchIcon, UsersIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
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
  indianStates,
  paymentTermsOptions,
  stateLabel,
} from '#/features/app-shell/data/india-masters.ts'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import type { PartyType } from '#/features/parties/party-service.ts'

function partyTypeBadge(partyType: PartyType) {
  if (partyType === 'customer') return <Badge variant="info">Customer</Badge>
  if (partyType === 'supplier') return <Badge variant="warning">Supplier</Badge>
  return <Badge variant="secondary">Both</Badge>
}

export function PartiesPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey, isReady, error: workspaceError } =
    useWorkspace()
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | PartyType>('all')
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [partyType, setPartyType] = React.useState<PartyType>('customer')
  const [gstin, setGstin] = React.useState('')
  const [stateCode, setStateCode] = React.useState('27')
  const [creditLimit, setCreditLimit] = React.useState('')
  const [paymentTermsDays, setPaymentTermsDays] = React.useState('30')
  const [priceListId, setPriceListId] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
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

  const createParty = useMutation(trpc.parties.create.mutationOptions())

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

  const parties = partiesQuery.data ?? []
  const filtered = parties.filter((party) => {
    const matchesFilter = filter === 'all' || party.partyType === filter
    const haystack =
      `${party.name} ${party.gstin ?? ''} ${party.stateCode}`.toLowerCase()
    return matchesFilter && haystack.includes(query.trim().toLowerCase())
  })

  function resetForm() {
    setName('')
    setPartyType('customer')
    setGstin('')
    setStateCode('27')
    setCreditLimit('')
    setPaymentTermsDays('30')
    setPriceListId('')
    setFormError(null)
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyId) {
      setFormError(
        isReady
          ? (workspaceError ?? 'No active company. Open Companies and create one.')
          : 'Workspace is still loading. Try again in a moment.',
      )
      return
    }
    if (!name.trim()) return

    const receivableAccountId = ledgerBySystemKey.customer_receivable ?? null
    const payableAccountId = ledgerBySystemKey.supplier_payable ?? null

    if (
      (partyType === 'customer' || partyType === 'both') &&
      !receivableAccountId
    ) {
      setFormError('Receivable ledger is missing for this company')
      return
    }
    if (
      (partyType === 'supplier' || partyType === 'both') &&
      !payableAccountId
    ) {
      setFormError('Payable ledger is missing for this company')
      return
    }

    setFormError(null)
    try {
      await createParty.mutateAsync({
        companyId,
        name: name.trim(),
        partyType,
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
        stateCode,
        creditLimit: creditLimit.trim() || null,
        paymentTermsDays: Number(paymentTermsDays) || 0,
        receivableAccountId:
          partyType === 'supplier' ? null : receivableAccountId,
        payableAccountId: partyType === 'customer' ? null : payableAccountId,
        priceListId: priceListId || null,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.parties.list.queryKey({ companyId }),
      })
      resetForm()
      setOpen(false)
    } catch (error) {
      setFormError(getFormErrorMessage(error))
    }
  }

  return (
    <WorkspacePage
      actions={
        <Dialog
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) resetForm()
          }}
          open={open}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              New party
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New party</DialogTitle>
              <DialogDescription>
                Customer / supplier master with GST state and credit terms.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-3" onSubmit={handleCreate}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" htmlFor="party-name">
                  Name
                </label>
                <Input
                  id="party-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Party legal / trade name"
                  required
                  value={name}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Type</span>
                  <Select
                    onValueChange={(value) => setPartyType(value as PartyType)}
                    value={partyType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="supplier">Supplier</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">State / POS</span>
                  <Select onValueChange={setStateCode} value={stateCode}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        {indianStates.map((state) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.name} ({state.code})
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="party-gstin">
                    GSTIN
                  </label>
                  <Input
                    id="party-gstin"
                    onChange={(event) => setGstin(event.target.value)}
                    placeholder="Optional · unregistered if blank"
                    value={gstin}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Payment terms</span>
                  <Select
                    onValueChange={setPaymentTermsDays}
                    value={paymentTermsDays}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        {paymentTermsOptions.map((term) => (
                          <SelectItem key={term.days} value={String(term.days)}>
                            {term.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" htmlFor="party-credit">
                  Credit limit
                </label>
                <Input
                  id="party-credit"
                  onChange={(event) => setCreditLimit(event.target.value)}
                  placeholder="e.g. 100000.00"
                  value={creditLimit}
                />
              </div>
              {(partyType === 'customer' || partyType === 'both') &&
              (priceListsQuery.data ?? []).length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Price list</span>
                  <Select
                    onValueChange={(value) =>
                      setPriceListId(value === 'none' ? '' : value)
                    }
                    value={priceListId || 'none'}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Default item rates" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectGroup>
                        <SelectItem value="none">Default item rates</SelectItem>
                        {(priceListsQuery.data ?? []).map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <DialogFooter>
                <Button disabled={createParty.isPending} type="submit">
                  {createParty.isPending ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
      description="People you buy from and sell to — GSTIN, credit limit, and outstanding balance."
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
            <div className="relative w-full max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or GSTIN"
                value={query}
              />
            </div>
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
                <TableHead>Credit limit</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Price list</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partiesQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={8}
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
                        ? (priceListNameById.get(party.priceListId) ?? 'Assigned')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatInr(outstandingByPartyId.get(party.id) ?? 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
