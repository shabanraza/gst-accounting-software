import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileTextIcon, PlusIcon, Trash2Icon } from 'lucide-react'

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

import { documentStatusBadgeIntent } from '#/lib/badge-intent.ts'

const documentTypeLabels = {
  quotation: 'Quotation',
  sales_order: 'Sales order',
  delivery_challan: 'Delivery challan',
} as const

type SalesDocumentLineDraft = {
  key: string
  itemId: string
  quantity: string
  rate: string
}

function createEmptySalesDocumentLine(): SalesDocumentLineDraft {
  return {
    key: crypto.randomUUID(),
    itemId: '',
    quantity: '1',
    rate: '',
  }
}

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
  const [lines, setLines] = React.useState<Array<SalesDocumentLineDraft>>([
    createEmptySalesDocumentLine(),
  ])

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
  }, [customers, customerId])

  React.useEffect(() => {
    if (!items[0]) return

    setLines((current) => {
      if (current[0]?.itemId) return current

      return current.map((line, index) =>
        index === 0
          ? {
              ...line,
              itemId: items[0]!.id,
              rate: items[0]!.saleRate,
            }
          : line,
      )
    })
  }, [items])

  function updateLine(index: number, patch: Partial<SalesDocumentLineDraft>) {
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
        ...createEmptySalesDocumentLine(),
        itemId: nextItem?.id ?? '',
        rate: nextItem?.saleRate ?? '',
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

    const selectedCustomerId = requireSelection(customerId, 'a customer')
    if (!selectedCustomerId) return

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
        rate: line.rate || item.saleRate,
      })
    }

    if (payloadLines.length === 0) {
      toast.error('Add at least one item.')
      return
    }

    try {
      await createDocument.mutateAsync({
        companyId,
        documentType,
        documentNumber:
          documentNumber.trim() ||
          `${documentType.toUpperCase()}-${Date.now()}`,
        documentDate,
        customerId: selectedCustomerId,
        lines: payloadLines,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.salesDocuments.list.queryKey({ companyId }),
      })
      setDocumentNumber('')
      setLines([
        {
          ...createEmptySalesDocumentLine(),
          itemId: items[0]?.id ?? '',
          rate: items[0]?.saleRate ?? '',
        },
      ])
      toast.success(`${documentTypeLabels[documentType]} created.`)
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
              <FieldGroup label="Document type">
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
                      {Object.entries(documentTypeLabels).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Document number">
                <Input
                  onChange={(event) => setDocumentNumber(event.target.value)}
                  placeholder="Auto if blank"
                  value={documentNumber}
                />
              </FieldGroup>
              <FieldGroup label="Document date">
                <DatePicker onChange={setDocumentDate} value={documentDate} />
              </FieldGroup>
              <FieldGroup label="Customer">
                <Select onValueChange={setCustomerId} value={customerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
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
                            rate: item?.saleRate ?? line.rate,
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
            <CardDescription>
              Open documents for the active company.
            </CardDescription>
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
                      <Badge
                        variant={documentStatusBadgeIntent(document.status)}
                      >
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
