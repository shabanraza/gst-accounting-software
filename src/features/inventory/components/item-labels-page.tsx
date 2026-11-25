import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PrinterIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent, CardHeader } from '#/components/ui/card.tsx'
import { Checkbox } from '#/components/ui/checkbox.tsx'
import { Input } from '#/components/ui/input.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
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
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { Ean13Barcode } from '#/features/inventory/components/ean13-barcode.tsx'
import { useItemsList } from '#/features/masters/use-master-data.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { formatInr } from '#/lib/format-inr.ts'

import type { ItemRecord } from '#/features/inventory/item-service.ts'

type LabelLayout = 'a4' | 'roll'

const layouts: Record<
  LabelLayout,
  { label: string; page: string; labelClass: string }
> = {
  a4: {
    label: 'A4 sheet (3 × 7, 63.5 × 38.1 mm)',
    page: '@page { size: A4; margin: 15mm 7mm; }',
    labelClass: 'h-[38.1mm] w-[63.5mm]',
  },
  roll: {
    label: 'Label roll (50 × 25 mm)',
    page: '@page { size: 50mm 25mm; margin: 0; }',
    labelClass: 'h-[25mm] w-[50mm] break-after-page',
  },
}

const MAX_COPIES = 500

function parseCopies(value: string) {
  const copies = Math.floor(Number(value))
  return Number.isFinite(copies) ? Math.min(Math.max(copies, 0), MAX_COPIES) : 0
}

export function ItemLabelsPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, company } = useWorkspace()
  const itemsQuery = useItemsList()
  const items = itemsQuery.data

  const [query, setQuery] = React.useState('')
  const [copiesById, setCopiesById] = React.useState<Record<string, string>>({})
  const [layout, setLayout] = React.useState<LabelLayout>('a4')
  const [assigned, setAssigned] = React.useState<Record<string, string>>({})
  const [printRequest, setPrintRequest] = React.useState(0)

  const assignBarcodes = useMutation(
    trpc.inventory.assignBarcodes.mutationOptions(),
  )

  React.useEffect(() => {
    if (printRequest === 0) return
    const timer = window.setTimeout(() => window.print(), 150)
    return () => window.clearTimeout(timer)
  }, [printRequest])

  const filtered = items.filter((item) => {
    const haystack =
      `${item.name} ${item.hsnCode} ${item.barcode ?? ''}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  const selected = items.filter((item) => item.id in copiesById)
  const barcodeOf = (item: ItemRecord) =>
    item.barcode || assigned[item.id] || ''
  const labels = selected.flatMap((item) =>
    Array.from({ length: parseCopies(copiesById[item.id]) }, () => item),
  )
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((item) => item.id in copiesById)

  function toggle(itemId: string, checked: boolean) {
    setCopiesById((current) => {
      const next = { ...current }
      if (checked) next[itemId] = current[itemId] ?? '1'
      else delete next[itemId]
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setCopiesById((current) => {
      const next = { ...current }
      for (const item of filtered) {
        if (checked) next[item.id] = current[item.id] ?? '1'
        else delete next[item.id]
      }
      return next
    })
  }

  async function handlePrint() {
    if (!companyId) return
    if (labels.length === 0) {
      toast.error('Pick at least one item and number of labels.')
      return
    }
    const missing = selected.filter((item) => !barcodeOf(item))
    if (missing.length > 0) {
      try {
        const updated = await assignBarcodes.mutateAsync({
          companyId,
          itemIds: missing.map((item) => item.id),
        })
        setAssigned((current) => ({
          ...current,
          ...Object.fromEntries(
            updated.map((item) => [item.id, item.barcode ?? '']),
          ),
        }))
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listItems.queryKey({ companyId }),
        })
      } catch (error) {
        toast.error(getFormErrorMessage(error))
        return
      }
    }
    setPrintRequest((count) => count + 1)
  }

  const sheet = (
    <div className="flex flex-wrap content-start bg-white text-black">
      {labels.map((item, index) => (
        <ItemLabel
          barcode={barcodeOf(item)}
          className={layouts[layout].labelClass}
          item={item}
          key={`${item.id}-${index}`}
          shopName={company?.tradeName || company?.legalName || ''}
        />
      ))}
    </div>
  )

  return (
    <>
      <style>{`@media print { ${layouts[layout].page} }`}</style>
      <div className="print:hidden">
        <WorkspacePage
          actions={
            <Button
              disabled={assignBarcodes.isPending}
              onClick={handlePrint}
              type="button"
            >
              <PrinterIcon data-icon="inline-start" />
              {assignBarcodes.isPending
                ? 'Preparing…'
                : `Print ${labels.length} ${labels.length === 1 ? 'label' : 'labels'}`}
            </Button>
          }
          description="Barcode labels with item name, MRP and sale price."
          title="Barcode labels"
        >
          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SearchInput
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, HSN or barcode"
                value={query}
                wrapperClassName="w-full max-w-sm"
              />
              <Select
                onValueChange={(value) => setLayout(value as LabelLayout)}
                value={layout}
              >
                <SelectTrigger
                  aria-label="Label size"
                  className="w-full lg:w-72"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(Object.keys(layouts) as Array<LabelLayout>).map((key) => (
                      <SelectItem key={key} value={key}>
                        {layouts[key].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Select all items"
                        checked={allFilteredSelected}
                        onCheckedChange={(checked) =>
                          toggleAll(checked === true)
                        }
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Sale</TableHead>
                    <TableHead className="w-24">Labels</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsQuery.isLoading ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        Loading items…
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        {query.trim()
                          ? 'No items match your search.'
                          : 'No items yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((item) => {
                      const isSelected = item.id in copiesById
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              aria-label={`Select ${item.name}`}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                toggle(item.id, checked === true)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {barcodeOf(item) || (
                              <span className="text-muted-foreground">
                                Not set
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{formatInr(item.saleRate)}</TableCell>
                          <TableCell>
                            <Input
                              aria-label={`Labels for ${item.name}`}
                              className="h-8 w-20 tabular-nums"
                              disabled={!isSelected}
                              inputMode="numeric"
                              max={MAX_COPIES}
                              min={1}
                              onChange={(event) =>
                                setCopiesById((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              type="number"
                              value={copiesById[item.id] ?? ''}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {labels.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border bg-white p-2">
              {sheet}
            </div>
          ) : null}
        </WorkspacePage>
      </div>
      <div className="hidden print:block">{sheet}</div>
    </>
  )
}

function ItemLabel({
  item,
  barcode,
  shopName,
  className,
}: {
  item: ItemRecord
  barcode: string
  shopName: string
  className: string
}) {
  const hasMrp = Number(item.mrp) > 0
  return (
    <div
      className={`flex shrink-0 break-inside-avoid flex-col items-center justify-center gap-0.5 overflow-hidden px-[2mm] py-[1mm] text-center leading-tight outline outline-dashed outline-black/20 print:outline-none ${className}`}
    >
      {shopName ? (
        <span className="w-full truncate text-[6pt] uppercase">{shopName}</span>
      ) : null}
      <span className="w-full truncate text-[8pt] font-semibold">
        {item.name}
      </span>
      {barcode ? (
        <Ean13Barcode className="h-auto max-h-[60%] w-full" code={barcode} />
      ) : (
        <span className="text-[7pt] text-black/50">No barcode yet</span>
      )}
      <span className="flex gap-2 text-[8pt] tabular-nums">
        {hasMrp ? <span>MRP {formatInr(item.mrp)}</span> : null}
        <span className="font-semibold">{formatInr(item.saleRate)}</span>
      </span>
    </div>
  )
}
