import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardListIcon, PackageCheckIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
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
import { FieldGroup } from '#/features/app-shell/components/field-label.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import {
  requirePositiveQuantity,
  requireSelection,
  requireWorkspace,
} from '#/lib/form-validation.ts'
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

type PurchaseOrderLineDraft = {
  key: string
  itemId: string
  quantity: string
  rate: string
}

function createEmptyPurchaseOrderLine(): PurchaseOrderLineDraft {
  return {
    key: crypto.randomUUID(),
    itemId: '',
    quantity: '1',
    rate: '',
  }
}

export function PurchaseOrdersPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, godowns, isReady } = useWorkspace()
  const [orderNumber, setOrderNumber] = React.useState('')
  const [orderDate, setOrderDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [supplierId, setSupplierId] = React.useState('')
  const [lines, setLines] = React.useState<Array<PurchaseOrderLineDraft>>([
    createEmptyPurchaseOrderLine(),
  ])

  const ordersQuery = useQuery({
    ...trpc.purchaseOrders.list.queryOptions({
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
  const itemsQuery = useQuery({
    ...trpc.inventory.listItems.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const createOrder = useMutation(trpc.purchaseOrders.create.mutationOptions())
  const receiveFromPo = useMutation(
    trpc.purchaseGrns.receiveFromPurchaseOrder.mutationOptions(),
  )

  const godownNames = godowns.map((entry) => entry.name)

  const suppliers = (partiesQuery.data ?? []).filter(
    (party) => party.partyType === 'supplier' || party.partyType === 'both',
  )
  const items = itemsQuery.data ?? []

  React.useEffect(() => {
    if (!supplierId && suppliers[0]) setSupplierId(suppliers[0].id)
  }, [suppliers, supplierId])

  React.useEffect(() => {
    if (!items[0]) return

    setLines((current) => {
      if (current[0]?.itemId) return current

      return current.map((line, index) =>
        index === 0
          ? {
              ...line,
              itemId: items[0]!.id,
              rate: items[0]!.purchaseRate,
            }
          : line,
      )
    })
  }, [items])

  function updateLine(
    index: number,
    patch: Partial<PurchaseOrderLineDraft>,
  ) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    )
  }

  function addLine() {
    const nextItem = items[0]
    setLines((current) => [
      ...current,
      {
        ...createEmptyPurchaseOrderLine(),
        itemId: nextItem?.id ?? '',
        rate: nextItem?.purchaseRate ?? '',
      },
    ])
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.length > 1
        ? current.filter((_, lineIndex) => lineIndex !== index)
        : current,
    )
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!requireWorkspace(companyId, isReady)) return

    const selectedSupplierId = requireSelection(supplierId, 'a supplier')
    if (!selectedSupplierId) return

    const payloadLines = []

    for (const line of lines) {
      const item = items.find((entry) => entry.id === line.itemId)
      if (!item) continue

      const lineQuantity = requirePositiveQuantity(line.quantity, 'Quantity')
      if (!lineQuantity) return

      payloadLines.push({
        itemId: item.id,
        description: item.name,
        quantity: lineQuantity,
        unit: item.baseUnit,
        rate: line.rate || item.purchaseRate,
        gstRate: item.gstRate,
      })
    }

    if (payloadLines.length === 0) {
      toast.error('Add at least one item.')
      return
    }

    try {
      await createOrder.mutateAsync({
        companyId,
        supplierId: selectedSupplierId,
        orderNumber: orderNumber.trim() || `PO-${Date.now()}`,
        orderDate,
        lines: payloadLines,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.purchaseOrders.list.queryKey({ companyId }),
      })
      setOrderNumber('')
      setLines([
        {
          ...createEmptyPurchaseOrderLine(),
          itemId: items[0]?.id ?? '',
          rate: items[0]?.purchaseRate ?? '',
        },
      ])
      toast.success('Purchase order created.')
    } catch (err) {
      toastActionError(err, 'Create failed')
    }
  }

  async function handleReceive(orderId: string) {
    if (!requireWorkspace(companyId, isReady)) return
    if (!godownNames[0]) {
      toast.error('Add a godown before receiving stock.')
      return
    }

    try {
      await receiveFromPo.mutateAsync({
        companyId,
        purchaseOrderId: orderId,
        grnNumber: `GRN-${Date.now()}`,
        grnDate: new Date().toISOString().slice(0, 10),
        godownName: godownNames[0],
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.purchaseOrders.list.queryKey({ companyId }),
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.purchaseGrns.list.queryKey({ companyId }),
      })
      toast.success('Goods received into stock.')
    } catch (err) {
      toastActionError(err, 'Receive failed')
    }
  }

  return (
    <WorkspacePage
      description="Purchase orders without ledger posting or stock movement."
      title="Purchase orders"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New purchase order</CardTitle>
            <CardDescription>
              Commitment to supplier — convert to purchase bill when goods
              arrive.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleCreate}>
              <FieldGroup label="PO number">
                <Input
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder="Auto if blank"
                  value={orderNumber}
                />
              </FieldGroup>
              <FieldGroup label="Order date">
                <DatePicker
                  onChange={setOrderDate}
                  value={orderDate}
                />
              </FieldGroup>
              <FieldGroup label="Supplier">
                <Select onValueChange={setSupplierId} value={supplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {suppliers.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {party.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <div className="flex flex-col gap-3">
                {lines.map((line, index) => (
                  <div
                    key={line.key}
                    className="flex flex-col gap-3 rounded-xl border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        Line {index + 1}
                      </span>
                      {lines.length > 1 ? (
                        <Button
                          onClick={() => removeLine(index)}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon />
                        </Button>
                      ) : null}
                    </div>
                    <FieldGroup label="Item">
                      <Select
                        onValueChange={(value) => {
                          const item = items.find((entry) => entry.id === value)
                          updateLine(index, {
                            itemId: value,
                            rate: item?.purchaseRate ?? line.rate,
                          })
                        }}
                        value={line.itemId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {items.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </FieldGroup>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <FieldGroup label="Quantity">
                        <Input
                          onChange={(event) =>
                            updateLine(index, { quantity: event.target.value })
                          }
                          value={line.quantity}
                        />
                      </FieldGroup>
                      <FieldGroup label="Rate">
                        <Input
                          onChange={(event) =>
                            updateLine(index, { rate: event.target.value })
                          }
                          value={line.rate}
                        />
                      </FieldGroup>
                    </div>
                  </div>
                ))}
                <Button onClick={addLine} type="button" variant="outline">
                  <PlusIcon data-icon="inline-start" />
                  Add line
                </Button>
              </div>
              <Button disabled={createOrder.isPending} type="submit">
                <PlusIcon data-icon="inline-start" />
                Create PO
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open orders</CardTitle>
            <CardDescription>Non-posted purchase orders.</CardDescription>
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
                {(ordersQuery.data ?? []).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.orderNumber}</TableCell>
                    <TableCell>{order.orderDate}</TableCell>
                    <TableCell>
                      <Badge variant={workflowStatusBadgeVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInr(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === 'open' ? (
                        <Button
                          disabled={receiveFromPo.isPending}
                          onClick={() => handleReceive(order.id)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          <PackageCheckIcon data-icon="inline-start" />
                          Receive (GRN)
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
