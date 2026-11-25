import * as React from 'react'
import Decimal from 'decimal.js'
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
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
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { localCalendarDate } from '#/lib/calendar-date.ts'
import { requireWorkspace, showValidationError } from '#/lib/form-validation.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

type JournalMode = 'count' | 'writeoff' | 'transfer'
type WriteOffReason = 'damage' | 'shrinkage' | 'other'
type JournalLine = { key: string; itemId: string; quantity: string }

const QUANTITY_PATTERN = /^\d+(\.\d{1,3})?$/

function newLine(): JournalLine {
  return { key: crypto.randomUUID(), itemId: '', quantity: '' }
}

function formatQuantity(value: Decimal): string {
  return value
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '')
}

export function StockJournalDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady } = useWorkspace()
  const enabled = open && companyId && isReady ? { companyId } : skipToken

  const [mode, setMode] = React.useState<JournalMode>('count')
  const [reason, setReason] = React.useState<WriteOffReason>('damage')
  const [date, setDate] = React.useState(() => localCalendarDate())
  const [godownName, setGodownName] = React.useState('')
  const [toGodown, setToGodown] = React.useState('')
  const [narration, setNarration] = React.useState('')
  const [lines, setLines] = React.useState<Array<JournalLine>>(() => [
    newLine(),
  ])

  const itemsQuery = useQuery(trpc.inventory.listItems.queryOptions(enabled))
  const godownsQuery = useQuery(
    trpc.inventory.listGodowns.queryOptions(enabled),
  )
  const godownStockQuery = useQuery(
    trpc.inventory.godownStock.queryOptions(enabled),
  )

  const items = (itemsQuery.data ?? []).filter((item) => item.tracksInventory)
  const itemById = new Map(items.map((item) => [item.id, item]))
  const godowns = godownsQuery.data ?? []
  const defaultGodownName =
    (godowns.find((godown) => godown.isDefault) ?? godowns.at(0))?.name ?? ''
  const fromGodown = godownName || defaultGodownName
  const bookByKey = new Map(
    (godownStockQuery.data ?? []).map((row) => [
      `${row.itemId}\u0000${row.godownName}`,
      row.quantity,
    ]),
  )
  const bookQuantity = (itemId: string) =>
    itemId ? (bookByKey.get(`${itemId}\u0000${fromGodown}`) ?? '0') : ''

  function reset() {
    setMode('count')
    setReason('damage')
    setDate(localCalendarDate())
    setGodownName('')
    setToGodown('')
    setNarration('')
    setLines([newLine()])
  }

  async function onPosted(documentNumber: string) {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.inventory.listStockBalances.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.inventory.godownStock.queryKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.inventory.itemStockHistory.queryKey(),
      }),
    ])
    toast.success(`Stock journal ${documentNumber} posted`)
    reset()
    onOpenChange(false)
  }

  const adjustmentMutation = useMutation(
    trpc.inventory.postStockAdjustment.mutationOptions({
      onSuccess: (result) => onPosted(result.documentNumber),
      onError: (error) => toastActionError(error, 'Stock journal not posted'),
    }),
  )
  const transferMutation = useMutation(
    trpc.inventory.postGodownTransfer.mutationOptions({
      onSuccess: (result) => onPosted(result.documentNumber),
      onError: (error) => toastActionError(error, 'Stock journal not posted'),
    }),
  )
  const isPending = adjustmentMutation.isPending || transferMutation.isPending

  function updateLine(key: string, patch: Partial<JournalLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    )
  }

  function submit() {
    if (!requireWorkspace(companyId)) return
    if (!fromGodown) {
      showValidationError('Choose a godown')
      return
    }
    const filled = lines.filter((line) => line.itemId || line.quantity.trim())
    if (filled.length === 0) {
      showValidationError('Add at least one item')
      return
    }
    for (const line of filled) {
      const quantity = line.quantity.trim()
      if (!line.itemId) {
        showValidationError('Choose an item on every line')
        return
      }
      if (
        !QUANTITY_PATTERN.test(quantity) ||
        (mode !== 'count' && new Decimal(quantity).lte(0))
      ) {
        showValidationError(
          `Enter a valid quantity for ${itemById.get(line.itemId)?.name ?? 'each item'}`,
        )
        return
      }
    }
    const payloadLines = filled.map((line) => ({
      itemId: line.itemId,
      quantity: line.quantity.trim(),
    }))

    if (mode === 'transfer') {
      if (!toGodown || toGodown === fromGodown) {
        showValidationError('Choose a different godown to transfer to')
        return
      }
      transferMutation.mutate({
        companyId,
        date,
        fromGodown,
        toGodown,
        lines: payloadLines,
      })
      return
    }

    adjustmentMutation.mutate({
      companyId,
      date,
      godownName: fromGodown,
      reason: mode === 'count' ? 'physical_count' : reason,
      narration: narration.trim() || undefined,
      lines: payloadLines,
    })
  }

  const quantityLabel =
    mode === 'count'
      ? 'Counted'
      : mode === 'transfer'
        ? 'Transfer'
        : 'Write off'

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
      open={open}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Stock journal</DialogTitle>
          <DialogDescription>
            Physical count, write-off or godown transfer
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4" data-ui="data">
          <Tabs
            onValueChange={(value) => setMode(value as JournalMode)}
            value={mode}
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="count">Physical count</TabsTrigger>
              <TabsTrigger value="writeoff">Write-off</TabsTrigger>
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock-journal-date">Date</Label>
              <DatePicker
                id="stock-journal-date"
                onChange={setDate}
                value={date}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{mode === 'transfer' ? 'From godown' : 'Godown'}</Label>
              <Select onValueChange={setGodownName} value={fromGodown}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Godown" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {godowns.map((godown) => (
                      <SelectItem key={godown.id} value={godown.name}>
                        {godown.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {mode === 'transfer' ? (
              <div className="flex flex-col gap-1.5">
                <Label>To godown</Label>
                <Select onValueChange={setToGodown} value={toGodown}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Godown" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {godowns
                        .filter((godown) => godown.name !== fromGodown)
                        .map((godown) => (
                          <SelectItem key={godown.id} value={godown.name}>
                            {godown.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : mode === 'writeoff' ? (
              <div className="flex flex-col gap-1.5">
                <Label>Reason</Label>
                <Select
                  onValueChange={(value) => setReason(value as WriteOffReason)}
                  value={reason}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="damage">Damage</SelectItem>
                      <SelectItem value="shrinkage">Shrinkage</SelectItem>
                      <SelectItem value="other">Other write-off</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-40">Item</TableHead>
                <TableHead className="text-right">Book qty</TableHead>
                <TableHead className="min-w-24 text-right">
                  {quantityLabel}
                </TableHead>
                {mode === 'count' ? (
                  <TableHead className="text-right">Difference</TableHead>
                ) : null}
                <TableHead className="w-10">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const book = bookQuantity(line.itemId)
                const quantity = line.quantity.trim()
                const difference =
                  mode === 'count' && book && QUANTITY_PATTERN.test(quantity)
                    ? new Decimal(quantity).minus(book)
                    : null
                const short =
                  mode !== 'count' &&
                  book !== '' &&
                  QUANTITY_PATTERN.test(quantity) &&
                  new Decimal(quantity).gt(book)
                return (
                  <TableRow key={line.key}>
                    <TableCell>
                      <Select
                        onValueChange={(value) =>
                          updateLine(line.key, { itemId: value })
                        }
                        value={line.itemId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose item" />
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
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {book}
                      {book && itemById.get(line.itemId)?.baseUnit
                        ? ` ${itemById.get(line.itemId)?.baseUnit}`
                        : ''}
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-invalid={short || undefined}
                        aria-label={quantityLabel}
                        className="text-right tabular-nums"
                        inputMode="decimal"
                        onChange={(event) =>
                          updateLine(line.key, { quantity: event.target.value })
                        }
                        placeholder="0"
                        value={line.quantity}
                      />
                    </TableCell>
                    {mode === 'count' ? (
                      <TableCell
                        className={
                          difference && difference.isNegative()
                            ? 'text-right tabular-nums text-destructive'
                            : 'text-right tabular-nums'
                        }
                      >
                        {difference
                          ? `${difference.isPositive() && !difference.isZero() ? '+' : ''}${formatQuantity(difference)}`
                          : ''}
                      </TableCell>
                    ) : null}
                    <TableCell>
                      <Button
                        aria-label="Remove line"
                        disabled={lines.length === 1}
                        onClick={() =>
                          setLines((current) =>
                            current.filter((entry) => entry.key !== line.key),
                          )
                        }
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div>
            <Button
              onClick={() => setLines((current) => [...current, newLine()])}
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusIcon data-icon="inline-start" />
              Add item
            </Button>
          </div>

          {mode !== 'transfer' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock-journal-narration">Narration</Label>
              <Input
                id="stock-journal-narration"
                maxLength={500}
                onChange={(event) => setNarration(event.target.value)}
                value={narration}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button disabled={isPending} onClick={submit} type="button">
            {isPending ? 'Posting…' : 'Post stock journal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
