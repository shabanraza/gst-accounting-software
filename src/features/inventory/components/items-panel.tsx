import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PackageIcon, PlusIcon, SearchIcon } from 'lucide-react'

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
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  gstRateOptions,
  itemGroups,
  unitOptions,
  uqcForUnit,
} from '#/features/app-shell/data/india-masters.ts'
import {
  formatInr,
  godowns as demoGodowns,
} from '#/features/app-shell/data/voucher-demo-masters.ts'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useItemsList } from '#/features/masters/use-master-data.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

const emptyForm = {
  name: '',
  alias: '',
  group: 'Fabrics',
  hsnCode: '',
  gstRate: '5.00',
  baseUnit: 'Meter',
  uqc: 'MTR',
  altUnit: 'none',
  conversionFactor: '',
  purchaseRate: '',
  saleRate: '',
  mrp: '',
  reorderLevel: '',
  openingQuantity: '100',
  openingGodown: demoGodowns[0],
  tracksInventory: 'yes',
}

export function ItemsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const {
    companyId,
    isReady,
    error: workspaceError,
    godowns,
  } = useWorkspace()
  const godownNames =
    godowns.length > 0 ? godowns.map((entry) => entry.name) : demoGodowns
  const [query, setQuery] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm)
  const [formError, setFormError] = React.useState<string | null>(null)

  const itemsQuery = useItemsList()

  const createItem = useMutation(
    trpc.inventory.createItemWithOpening.mutationOptions(),
  )

  const items = itemsQuery.data ?? []
  const filtered = items.filter((item) => {
    const haystack = `${item.name} ${item.hsnCode}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  function updateForm(field: string, value: string) {
    setForm((current) => {
      const next = { ...current, [field]: value }
      if (field === 'baseUnit') next.uqc = uqcForUnit(value)
      return next
    })
  }

  function resetForm() {
    setForm(emptyForm)
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
    if (!form.name.trim() || !form.hsnCode.trim()) return

    setFormError(null)
    try {
      await createItem.mutateAsync({
        companyId,
        name: form.name.trim(),
        alias: form.alias.trim(),
        itemGroup: form.group,
        hsnCode: form.hsnCode.trim(),
        gstRate: form.gstRate,
        baseUnit: form.baseUnit,
        alternateUnit: form.altUnit === 'none' ? '' : form.altUnit,
        conversionFactor:
          form.altUnit === 'none' ? '1' : form.conversionFactor || '1',
        mrp: form.mrp || '0.00',
        reorderLevel: form.reorderLevel || '0',
        purchaseRate: form.purchaseRate || '0.00',
        saleRate: form.saleRate || '0.00',
        tracksInventory: form.tracksInventory === 'yes',
        openingQuantity:
          form.tracksInventory === 'yes' && form.openingQuantity.trim()
            ? form.openingQuantity.trim()
            : null,
        openingOccurredOn: new Date().toISOString().slice(0, 10),
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.inventory.listItems.queryKey({ companyId }),
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.inventory.listStockBalances.queryKey({ companyId }),
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
              New item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Item master</DialogTitle>
              <DialogDescription>
                Group, HSN, tax slab, units, rates, and optional opening stock.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={handleCreate}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-medium" htmlFor="item-name">
                    Item name
                  </label>
                  <Input
                    id="item-name"
                    onChange={(event) => updateForm('name', event.target.value)}
                    required
                    value={form.name}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="item-alias">
                    Alias / code
                  </label>
                  <Input
                    id="item-alias"
                    onChange={(event) =>
                      updateForm('alias', event.target.value)
                    }
                    value={form.alias}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Item group</span>
                  <Select
                    onValueChange={(value) => updateForm('group', value)}
                    value={form.group}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {itemGroups.map((group) => (
                          <SelectItem key={group} value={group}>
                            {group}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="item-hsn">
                    HSN / SAC
                  </label>
                  <Input
                    id="item-hsn"
                    onChange={(event) =>
                      updateForm('hsnCode', event.target.value)
                    }
                    required
                    value={form.hsnCode}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">GST tax slab</span>
                  <Select
                    onValueChange={(value) => updateForm('gstRate', value)}
                    value={form.gstRate}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {gstRateOptions.map((rate) => (
                          <SelectItem key={rate} value={rate}>
                            {rate}%
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Main unit</span>
                  <Select
                    onValueChange={(value) => updateForm('baseUnit', value)}
                    value={form.baseUnit}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {unitOptions.map((unit) => (
                          <SelectItem key={unit.label} value={unit.label}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">UQC (GST return)</span>
                  <Input readOnly value={form.uqc} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Alternate unit</span>
                  <Select
                    onValueChange={(value) => updateForm('altUnit', value)}
                    value={form.altUnit}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">None</SelectItem>
                        {unitOptions
                          .filter((unit) => unit.label !== form.baseUnit)
                          .map((unit) => (
                            <SelectItem key={unit.label} value={unit.label}>
                              {unit.label}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="item-conv">
                    Conversion (1 alt = ? main)
                  </label>
                  <Input
                    disabled={form.altUnit === 'none'}
                    id="item-conv"
                    onChange={(event) =>
                      updateForm('conversionFactor', event.target.value)
                    }
                    placeholder="e.g. 50"
                    value={form.conversionFactor}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="item-pur">
                    Purchase rate
                  </label>
                  <Input
                    id="item-pur"
                    onChange={(event) =>
                      updateForm('purchaseRate', event.target.value)
                    }
                    value={form.purchaseRate}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="item-sale">
                    Sale rate
                  </label>
                  <Input
                    id="item-sale"
                    onChange={(event) =>
                      updateForm('saleRate', event.target.value)
                    }
                    value={form.saleRate}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="item-mrp">
                    MRP
                  </label>
                  <Input
                    id="item-mrp"
                    onChange={(event) => updateForm('mrp', event.target.value)}
                    placeholder="Optional"
                    value={form.mrp}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="item-reorder">
                    Reorder level
                  </label>
                  <Input
                    id="item-reorder"
                    onChange={(event) =>
                      updateForm('reorderLevel', event.target.value)
                    }
                    placeholder="Optional"
                    value={form.reorderLevel}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Track inventory</span>
                  <Select
                    onValueChange={(value) =>
                      updateForm('tracksInventory', value)
                    }
                    value={form.tracksInventory}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="yes">Yes — stock item</SelectItem>
                        <SelectItem value="no">
                          No — service / non-stock
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" htmlFor="item-open">
                    Opening stock qty
                  </label>
                  <Input
                    disabled={form.tracksInventory !== 'yes'}
                    id="item-open"
                    onChange={(event) =>
                      updateForm('openingQuantity', event.target.value)
                    }
                    placeholder="Optional"
                    value={form.openingQuantity}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium">Opening godown</span>
                  <Select
                    disabled={form.tracksInventory !== 'yes'}
                    onValueChange={(value) =>
                      updateForm('openingGodown', value)
                    }
                    value={form.openingGodown}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {godownNames.map((godown) => (
                          <SelectItem key={godown} value={godown}>
                            {godown}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <DialogFooter>
                <Button disabled={createItem.isPending} type="submit">
                  {createItem.isPending ? 'Saving…' : 'Save item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
      description="Item master wired to inventory API, with optional opening stock movement."
      title="Items"
    >
      {workspaceError ? (
        <p className="text-sm text-destructive">{workspaceError}</p>
      ) : null}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageIcon className="size-4 text-muted-foreground" />
              Item master
            </CardTitle>
            <CardDescription>
              {filtered.length} items · F2 lookup on vouchers uses this list
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-sm">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or HSN"
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
                <TableHead>Group</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Purchase</TableHead>
                <TableHead>Sale</TableHead>
                <TableHead>Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    Loading items…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={8}
                  >
                    No items yet. Create the first item master.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.itemGroup || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {item.hsnCode}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.gstRate}%</Badge>
                    </TableCell>
                    <TableCell>{item.baseUnit}</TableCell>
                    <TableCell>{formatInr(item.purchaseRate)}</TableCell>
                    <TableCell>{formatInr(item.saleRate)}</TableCell>
                    <TableCell>
                      {item.tracksInventory ? (
                        <Badge variant="success">Tracked</Badge>
                      ) : (
                        <Badge variant="secondary">Service</Badge>
                      )}
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
