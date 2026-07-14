import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileTextIcon, PlusIcon } from 'lucide-react'

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

const documentTypeLabels = {
  quotation: 'Quotation',
  sales_order: 'Sales order',
  delivery_challan: 'Delivery challan',
} as const

import { documentStatusBadgeIntent } from '#/lib/badge-intent.ts'

export function SalesDocumentsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady } = useWorkspace()
  const [documentType, setDocumentType] =
    React.useState<keyof typeof documentTypeLabels>('quotation')
  const [documentNumber, setDocumentNumber] = React.useState('')
  const [documentDate, setDocumentDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [customerId, setCustomerId] = React.useState('')
  const [itemId, setItemId] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')
  const [rate, setRate] = React.useState('')

  const documentsQuery = useQuery({
    ...trpc.salesDocuments.list.queryOptions({
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

  const createDocument = useMutation(
    trpc.salesDocuments.create.mutationOptions(),
  )

  const customers = (partiesQuery.data ?? []).filter(
    (party) => party.partyType === 'customer' || party.partyType === 'both',
  )
  const items = itemsQuery.data ?? []

  React.useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id)
    if (!itemId && items[0]) {
      setItemId(items[0].id)
      setRate(items[0].saleRate)
    }
  }, [customers, items, customerId, itemId])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!companyId) return
    const item = items.find((entry) => entry.id === itemId)
    if (!item) {
      toast.error('Select an item')
      return
    }

    try {
      await createDocument.mutateAsync({
        companyId,
        documentType,
        documentNumber: documentNumber.trim() || `${documentType.toUpperCase()}-${Date.now()}`,
        documentDate,
        customerId,
        lines: [
          {
            itemId: item.id,
            description: item.name,
            quantity,
            unit: item.baseUnit,
            rate: rate || item.saleRate,
          },
        ],
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.salesDocuments.list.queryKey({ companyId }),
      })
      setDocumentNumber('')
    } catch (err) {
      toastActionError(err, 'Create failed')
    }
  }

  return (
    <WorkspacePage
      description="Quotations, sales orders, and delivery challans before invoicing."
      title="Sales documents"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New document</CardTitle>
            <CardDescription>
              Non-posting sales paperwork. Convert open documents to invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={handleCreate}>
              <Select
                onValueChange={(value) =>
                  setDocumentType(value as keyof typeof documentTypeLabels)
                }
                value={documentType}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.entries(documentTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Input
                onChange={(event) => setDocumentNumber(event.target.value)}
                placeholder="Document number (optional)"
                value={documentNumber}
              />
              <Input
                onChange={(event) => setDocumentDate(event.target.value)}
                type="date"
                value={documentDate}
              />
              <Select onValueChange={setCustomerId} value={customerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {customers.map((party) => (
                      <SelectItem key={party.id} value={party.id}>
                        {party.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select onValueChange={setItemId} value={itemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Item" />
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
              <div className="grid grid-cols-2 gap-2">
                <Input
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Qty"
                  value={quantity}
                />
                <Input
                  onChange={(event) => setRate(event.target.value)}
                  placeholder="Rate"
                  value={rate}
                />
              </div>
              <Button disabled={createDocument.isPending} type="submit">
                <PlusIcon data-icon="inline-start" />
                Create
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
            <CardDescription>Open documents for the active company.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(documentsQuery.data ?? []).map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <Badge variant="neutral">
                        {documentTypeLabels[document.documentType]}
                      </Badge>
                    </TableCell>
                    <TableCell>{document.documentNumber}</TableCell>
                    <TableCell>{document.documentDate}</TableCell>
                    <TableCell>
                      <Badge variant={documentStatusBadgeIntent(document.status)}>
                        {document.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInr(document.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {document.status === 'open' ? (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            search={{ fromDocument: document.id }}
                            to="/app/sales/new"
                          >
                            <FileTextIcon data-icon="inline-start" />
                            Convert to invoice
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
