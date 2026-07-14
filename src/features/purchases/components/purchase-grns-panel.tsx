import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileTextIcon, PlusIcon } from 'lucide-react'

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
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

function workflowStatusBadgeVariant(status: string) {
  if (status === 'open') {
    return 'info' as const
  }

  if (status === 'converted' || status === 'closed') {
    return 'success' as const
  }

  if (status === 'cancelled') {
    return 'destructive' as const
  }

  return 'outline' as const
}

export function PurchaseGrnsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, godowns, isReady } = useWorkspace()
  const [grnNumber, setGrnNumber] = React.useState('')
  const [grnDate, setGrnDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [purchaseOrderId, setPurchaseOrderId] = React.useState('')
  const [godownName, setGodownName] = React.useState('')

  const grnsQuery = useQuery({
    ...trpc.purchaseGrns.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const ordersQuery = useQuery({
    ...trpc.purchaseOrders.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const receiveFromPo = useMutation(
    trpc.purchaseGrns.receiveFromPurchaseOrder.mutationOptions(),
  )

  const openOrders = (ordersQuery.data ?? []).filter(
    (order) => order.status === 'open',
  )
  const godownNames = godowns.map((entry) => entry.name)

  React.useEffect(() => {
    if (!purchaseOrderId && openOrders[0]) {
      setPurchaseOrderId(openOrders[0].id)
    }
    if (!godownName && godownNames[0]) {
      setGodownName(godownNames[0])
    }
  }, [openOrders, purchaseOrderId, godownName, godownNames])

  async function handleReceive(event: React.FormEvent) {
    event.preventDefault()
    if (!companyId || !purchaseOrderId) return

    try {
      await receiveFromPo.mutateAsync({
        companyId,
        purchaseOrderId,
        grnNumber: grnNumber.trim() || `GRN-${Date.now()}`,
        grnDate,
        godownName: godownName || undefined,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.purchaseGrns.list.queryKey({ companyId }),
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.purchaseOrders.list.queryKey({ companyId }),
      })
      setGrnNumber('')
    } catch (err) {
      toastActionError(err, 'Receive failed')
    }
  }

  return (
    <WorkspacePage
      description="Goods receipt notes record stock-in from purchase orders."
      title="Purchase GRNs"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receive from PO</CardTitle>
            <CardDescription>
              Posts stock-in without a purchase bill. Convert to bill when the
              supplier invoice arrives.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleReceive}>
              <Select onValueChange={setPurchaseOrderId} value={purchaseOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Open purchase order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {openOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNumber}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                onChange={(event) => setGrnNumber(event.target.value)}
                placeholder="GRN number (optional)"
                value={grnNumber}
              />
              <Input
                onChange={(event) => setGrnDate(event.target.value)}
                type="date"
                value={grnDate}
              />
              {godownNames.length > 0 ? (
                <Select onValueChange={setGodownName} value={godownName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Godown" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {godownNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : null}
              <Button disabled={receiveFromPo.isPending} type="submit">
                <PlusIcon data-icon="inline-start" />
                Receive goods
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">GRN register</CardTitle>
            <CardDescription>Received goods awaiting purchase bills.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(grnsQuery.data ?? []).map((grn) => (
                  <TableRow key={grn.id}>
                    <TableCell>{grn.grnNumber}</TableCell>
                    <TableCell>{grn.grnDate}</TableCell>
                    <TableCell>
                      <Badge variant={workflowStatusBadgeVariant(grn.status)}>
                        {grn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInr(grn.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {grn.status === 'open' ? (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            search={{ fromGrn: grn.id }}
                            to="/app/purchases/new"
                          >
                            <FileTextIcon data-icon="inline-start" />
                            Convert to bill
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </WorkspacePage>
  )
}
