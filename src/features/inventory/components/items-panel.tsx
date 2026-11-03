import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { BarcodeIcon, PackageIcon, PencilIcon, PlusIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { itemTrackingBadgeIntent } from '#/lib/badge-intent.ts'
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
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/lib/format-inr.ts'
import { CreateItemDialog } from '#/features/inventory/components/create-item-dialog.tsx'
import { useItemsList } from '#/features/masters/use-master-data.ts'
import type { ItemRecord } from '#/features/inventory/item-service.ts'

export function ItemsPanel() {
  const { error: workspaceError } = useWorkspace()
  const [query, setQuery] = React.useState('')
  const [editingItem, setEditingItem] = React.useState<ItemRecord | null>(null)

  const itemsQuery = useItemsList()

  const items = itemsQuery.data
  const filtered = items.filter((item) => {
    const haystack =
      `${item.name} ${item.hsnCode} ${item.barcode ?? ''}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  return (
    <WorkspacePage
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/app/masters/item-labels">
              <BarcodeIcon data-icon="inline-start" />
              Print labels
            </Link>
          </Button>
          <CreateItemDialog
            trigger={
              <Button>
                <PlusIcon data-icon="inline-start" />
                New item
              </Button>
            }
          />
        </>
      }
      description="The goods and services you buy and sell, with HSN, GST rate, units and rates."
      title="Items"
    >
      {workspaceError ? (
        <p className="text-sm text-destructive">{workspaceError}</p>
      ) : null}
      {editingItem ? (
        <CreateItemDialog
          item={editingItem}
          key={editingItem.id}
          onOpenChange={(open) => {
            if (!open) setEditingItem(null)
          }}
          open
        />
      ) : null}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageIcon className="size-4 text-muted-foreground" />
              Item master
            </CardTitle>
            <CardDescription>
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SearchInput
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, HSN or barcode"
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
                <TableHead>Group</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Purchase</TableHead>
                <TableHead>Sale</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={9}
                  >
                    Loading items…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={9}
                  >
                    {query.trim()
                      ? 'No items match your search.'
                      : 'No items yet.'}
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
                      <Badge variant="secondary">{item.gstRate}%</Badge>
                    </TableCell>
                    <TableCell>{item.baseUnit}</TableCell>
                    <TableCell>{formatInr(item.purchaseRate)}</TableCell>
                    <TableCell>{formatInr(item.saleRate)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={itemTrackingBadgeIntent(item.tracksInventory)}
                      >
                        {item.tracksInventory ? 'Tracked' : 'Service'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditingItem(item)}
                        size="icon"
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
    </WorkspacePage>
  )
}
