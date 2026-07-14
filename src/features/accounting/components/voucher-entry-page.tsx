import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
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
import { Textarea } from '#/components/ui/textarea.tsx'
import { MasterLookup } from '#/features/app-shell/components/master-lookup.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  indianStates,
  purchaseSeriesOptions,
  salesSeriesOptions,
  stateLabel,
  uqcForUnit,
} from '#/features/app-shell/data/india-masters.ts'
import {
  COMPANY_STATE_CODE,
  formatInr,
  godowns as demoGodowns,
} from '#/features/app-shell/data/voucher-demo-masters.ts'
import {
  computeVoucherLine,
  computeVoucherTotals,
  createEmptyVoucherLines,
  emptyVoucherLine,
  partyStateForRegion,
} from '#/features/accounting/voucher-math.ts'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useItemsList, usePartiesList } from '#/features/masters/use-master-data.ts'
import { VoucherPreviewSheet } from '#/features/documents/components/voucher-preview-sheet.tsx'
import type { VoucherPreviewTarget } from '#/features/documents/components/voucher-preview-sheet.tsx'
import { CreateItemDialog } from '#/features/inventory/components/create-item-dialog.tsx'
import { CreatePartyDialog } from '#/features/parties/components/create-party-dialog.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'
import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'
import type {
  SupplyRegion,
  TaxMode,
  VoucherLineDraft,
} from '#/features/accounting/voucher-math.ts'

type SalesVoucherProps = {
  mode: 'sales' | 'purchase'
  sourceDocumentId?: string
  sourceGrnId?: string
}

export function VoucherEntryPage({
  mode,
  sourceDocumentId,
  sourceGrnId,
}: SalesVoucherProps) {
  const isSales = mode === 'sales'
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, company, activeFinancialYearId, ledgerBySystemKey, godowns, isReady } =
    useWorkspace()
  const godownNames =
    godowns.length > 0 ? godowns.map((entry) => entry.name) : demoGodowns
  const showLineGodown = godownNames.length > 1
  const seriesOptions = isSales ? salesSeriesOptions : purchaseSeriesOptions

  const partiesQuery = usePartiesList()
  const itemsQuery = useItemsList()

  const postSales = useMutation(trpc.sales.postInvoice.mutationOptions())
  const postPurchase = useMutation(trpc.purchases.postBill.mutationOptions())
  const markDocumentConverted = useMutation(
    trpc.salesDocuments.markConverted.mutationOptions(),
  )
  const markGrnConverted = useMutation(
    trpc.purchaseGrns.markConverted.mutationOptions(),
  )
  const nextNumber = useMutation(trpc.documents.nextNumber.mutationOptions())
  const createAttachment = useMutation(
    trpc.documents.uploadAttachment.mutationOptions(),
  )

  const parties = (partiesQuery.data).filter((party) =>
    isSales
      ? party.partyType === 'customer' || party.partyType === 'both'
      : party.partyType === 'supplier' || party.partyType === 'both',
  )
  const items = itemsQuery.data

  const [series, setSeries] = React.useState<string>(seriesOptions[0])
  const [voucherNoPreview, setVoucherNoPreview] = React.useState('Auto')
  const [voucherDate, setVoucherDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [region, setRegion] = React.useState<SupplyRegion>(
    isSales ? 'local' : 'central',
  )
  const [taxMode, setTaxMode] = React.useState<TaxMode>('exclusive')
  const [partyId, setPartyId] = React.useState('')
  const [placeOfSupply, setPlaceOfSupply] = React.useState(
    company?.stateCode ?? COMPANY_STATE_CODE,
  )
  const [godown, setGodown] = React.useState<string>(godownNames[0])
  const [paymentMode, setPaymentMode] = React.useState<'credit' | 'cash'>(
    'credit',
  )
  const [supplierBillNo, setSupplierBillNo] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [poReference, setPoReference] = React.useState('')
  const [transportMode, setTransportMode] = React.useState('')
  const [vehicleNo, setVehicleNo] = React.useState('')
  const [lrNumber, setLrNumber] = React.useState('')
  const [challanRef, setChallanRef] = React.useState('')
  const [narration, setNarration] = React.useState('')
  const [freight, setFreight] = React.useState('0.00')
  const [packing, setPacking] = React.useState('0.00')
  const [roundOff, setRoundOff] = React.useState('0.00')
  const [billDiscount, setBillDiscount] = React.useState('0.00')
  const [lines, setLines] = React.useState<Array<VoucherLineDraft>>(() =>
    createEmptyVoucherLines(1, godownNames[0]),
  )
  const [priceListRates, setPriceListRates] = React.useState<
    Record<string, string>
  >({})
  const [prefillApplied, setPrefillApplied] = React.useState(false)
  const [previewTarget, setPreviewTarget] =
    React.useState<VoucherPreviewTarget | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null)
  const [partyCreateOpen, setPartyCreateOpen] = React.useState(false)
  const [itemCreateOpen, setItemCreateOpen] = React.useState(false)
  const [itemCreateLineKey, setItemCreateLineKey] = React.useState<string | null>(
    null,
  )
  const formRef = React.useRef<HTMLFormElement>(null)
  const activeRowIndexRef = React.useRef(0)
  const companyState = company?.stateCode ?? COMPANY_STATE_CODE

  function reportSaveError(error: unknown, fallback = 'Save failed') {
    if (typeof error === 'string') {
      toast.error(error)
      return
    }
    toastActionError(error, fallback)
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'F2') {
        const target = event.target as HTMLElement | null
        if (target?.closest('[data-master-lookup]')) return
        if (document.querySelector('[role="dialog"][data-state="open"]')) return
        event.preventDefault()
        formRef.current?.requestSubmit()
        return
      }
      if (event.key === 'F9') {
        const target = event.target as HTMLElement | null
        if (!target?.closest('[data-voucher-grid]')) return
        event.preventDefault()
        const lineKey = lines[activeRowIndexRef.current]?.key
        if (lineKey) {
          setLines((current) => {
            const next = current.filter((line) => line.key !== lineKey)
            return next.length === 0
              ? createEmptyVoucherLines(1, godown)
              : ensureTrailingEmptyRows(next)
          })
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lines])

  React.useEffect(() => {
    if (!partyId && parties[0]) {
      setPartyId(parties[0].id)
      setPlaceOfSupply(parties[0].stateCode)
      setRegion(
        parties[0].stateCode === companyState ? 'local' : 'central',
      )
    }
  }, [parties, partyId, companyState])

  React.useEffect(() => {
    if (godowns.length > 0 && !godowns.some((entry) => entry.name === godown)) {
      setGodown(godowns[0].name)
    }
  }, [godowns, godown])

  const party = parties.find((item) => item.id === partyId)
  const activePriceListId = party?.priceListId ?? null

  const salesDraftQuery = useQuery({
    ...trpc.salesDocuments.buildInvoiceDraft.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      documentId: sourceDocumentId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled:
      Boolean(companyId) &&
      isReady &&
      isSales &&
      Boolean(sourceDocumentId) &&
      !prefillApplied,
  })

  const grnDraftQuery = useQuery({
    ...trpc.purchaseGrns.buildBillDraft.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      grnId: sourceGrnId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled:
      Boolean(companyId) &&
      isReady &&
      !isSales &&
      Boolean(sourceGrnId) &&
      !prefillApplied,
  })

  const priceListItemsQuery = useQuery({
    ...trpc.inventory.listPriceListItems.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      priceListId: activePriceListId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: Boolean(companyId) && Boolean(activePriceListId) && isReady,
  })

  React.useEffect(() => {
    if (!priceListItemsQuery.data) {
      setPriceListRates({})
      return
    }

    const nextRates: Record<string, string> = {}
    for (const entry of priceListItemsQuery.data) {
      nextRates[entry.itemId] = entry.rate
    }
    setPriceListRates(nextRates)
  }, [priceListItemsQuery.data])

  React.useEffect(() => {
    if (prefillApplied) return

    const draft = isSales ? salesDraftQuery.data : grnDraftQuery.data
    if (!draft) return

    if (isSales && 'customerId' in draft) {
      setPartyId(draft.customerId)
      setVoucherDate(draft.documentDate)
      setNarration(draft.narration)
      setLines(
        draft.lines.map((line) => ({
          key: crypto.randomUUID(),
          itemId: line.itemId,
          itemName: line.itemName,
          hsnCode: line.hsnCode,
          gstRate: line.gstRate,
          unit: line.unit,
          uqc: uqcForUnit(line.unit),
          quantity: line.quantity,
          rate: line.rate,
          discountPercent: '0',
          godownName: godown,
        })),
      )
      setPrefillApplied(true)
      return
    }

    if (!isSales && 'supplierId' in draft) {
      setPartyId(draft.supplierId)
      setVoucherDate(draft.grnDate)
      setNarration(draft.narration)
      if (draft.godownName) {
        setGodown(draft.godownName)
      }
      setLines(
        draft.lines.map((line) => ({
          key: crypto.randomUUID(),
          itemId: line.itemId,
          itemName: line.itemName,
          hsnCode: line.hsnCode,
          gstRate: line.gstRate,
          unit: line.unit,
          uqc: uqcForUnit(line.unit),
          quantity: line.quantity,
          rate: line.rate,
          discountPercent: '0',
          godownName: draft.godownName ?? godown,
        })),
      )
      setPrefillApplied(true)
    }
  }, [
    grnDraftQuery.data,
    godown,
    isSales,
    prefillApplied,
    salesDraftQuery.data,
  ])

  const computedLines = lines.map((line) =>
    computeVoucherLine(line, region, placeOfSupply, taxMode, companyState),
  )
  const totals = computeVoucherTotals(computedLines, {
    freight,
    packing,
    roundOff,
    billDiscount,
  })

  function ensureTrailingEmptyRows(next: Array<VoucherLineDraft>) {
    const last = next.at(-1)
    if (last?.itemId) {
      return [...next, emptyVoucherLine(godown)]
    }
    return next
  }

  function updateLine(key: string, patch: Partial<VoucherLineDraft>) {
    setLines((current) =>
      ensureTrailingEmptyRows(
        current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
      ),
    )
  }

  function handleGridKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    column: 'quantity' | 'rate' | 'discountPercent',
  ) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const order: Array<'quantity' | 'rate' | 'discountPercent'> = [
      'quantity',
      'rate',
      'discountPercent',
    ]
    const colIndex = order.indexOf(column)
    if (colIndex < order.length - 1) {
      const next = document.querySelector<HTMLInputElement>(
        `[data-voucher-cell="${rowIndex}-${order[colIndex + 1]}"]`,
      )
      next?.focus()
      next?.select()
      return
    }
    const nextRow = document.querySelector<HTMLInputElement>(
      `[data-voucher-cell="${rowIndex + 1}-quantity"]`,
    )
    if (nextRow) {
      nextRow.focus()
      nextRow.select()
      return
    }
    addLine()
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>(
          `[data-voucher-cell="${rowIndex + 1}-quantity"]`,
        )
        ?.focus()
    })
  }

  function selectParty(nextPartyId: string) {
    const nextParty = parties.find((entry) => entry.id === nextPartyId)
    setPartyId(nextPartyId)
    if (nextParty) {
      setPlaceOfSupply(nextParty.stateCode)
      setRegion(
        nextParty.stateCode === (company?.stateCode ?? COMPANY_STATE_CODE)
          ? 'local'
          : 'central',
      )
      if (!isSales && nextParty.paymentTermsDays > 0) {
        const due = new Date()
        due.setDate(due.getDate() + nextParty.paymentTermsDays)
        setDueDate(due.toISOString().slice(0, 10))
      }
    }
  }

  function applyCreatedParty(createdParty: PartyRecord) {
    selectParty(createdParty.id)
    setPlaceOfSupply(createdParty.stateCode)
    setRegion(
      createdParty.stateCode === (company?.stateCode ?? COMPANY_STATE_CODE)
        ? 'local'
        : 'central',
    )
    if (!isSales && createdParty.paymentTermsDays > 0) {
      const due = new Date()
      due.setDate(due.getDate() + createdParty.paymentTermsDays)
      setDueDate(due.toISOString().slice(0, 10))
    }
  }

  function applyItemToLine(key: string, item: ItemRecord) {
    const listRate = activePriceListId ? priceListRates[item.id] : undefined
    const rate =
      listRate ??
      (isSales ? item.saleRate : item.purchaseRate)

    updateLine(key, {
      itemId: item.id,
      itemName: item.name,
      hsnCode: item.hsnCode,
      gstRate: item.gstRate,
      unit: item.baseUnit,
      uqc: uqcForUnit(item.baseUnit),
      rate,
      godownName: godown,
    })
  }

  function selectItem(key: string, itemId: string) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return
    applyItemToLine(key, item)
  }

  function openItemCreate(lineKey: string) {
    setItemCreateLineKey(lineKey)
    setItemCreateOpen(true)
  }

  function handleItemCreated(item: ItemRecord) {
    const lineKey = itemCreateLineKey
    setItemCreateLineKey(null)
    if (lineKey) {
      applyItemToLine(lineKey, item)
    }
  }

  function selectLineGodown(key: string, godownName: string) {
    updateLine(key, { godownName })
  }

  function handleHeaderGodownChange(nextGodown: string) {
    setGodown(nextGodown)
    setLines((current) =>
      current.map((line) =>
        !line.itemId || line.godownName === godown
          ? { ...line, godownName: nextGodown }
          : line,
      ),
    )
  }

  function selectUnit(key: string, unit: string) {
    updateLine(key, {
      unit,
      uqc: uqcForUnit(unit),
    })
  }

  function addLine() {
    setLines((current) => [...current, emptyVoucherLine(godown)])
  }

  function removeLine(key: string) {
    setLines((current) => {
      const next = current.filter((line) => line.key !== key)
      return next.length === 0
        ? createEmptyVoucherLines(1, godown)
        : ensureTrailingEmptyRows(next)
    })
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyId || !company) {
      reportSaveError('Workspace is still loading. Try again in a moment.')
      return
    }
    if (!party) {
      reportSaveError(
        isSales
          ? 'Select a customer or add one from the lookup.'
          : 'Select a supplier or add one from the lookup.',
      )
      return
    }

    const filledLines = computedLines.filter((line) => line.itemId)
    if (filledLines.length === 0) {
      reportSaveError('Add at least one item row')
      return
    }
    if (!isSales && !supplierBillNo.trim()) {
      reportSaveError('Supplier bill no. is required')
      return
    }

    const requiredLedgers = isSales
      ? ['sales', 'output_gst', 'customer_receivable', 'cash']
      : ['purchase', 'input_gst', 'supplier_payable', 'stock_in_hand']

    for (const key of requiredLedgers) {
      if (!ledgerBySystemKey[key]) {
        reportSaveError(`Missing ledger mapping: ${key}`)
        return
      }
    }

    const salesAccountId = ledgerBySystemKey.sales as string
    const outputGstAccountId = ledgerBySystemKey.output_gst as string
    const receivableAccountId = ledgerBySystemKey.customer_receivable as string
    const cashAccountId = ledgerBySystemKey.cash as string
    const purchaseAccountId = ledgerBySystemKey.purchase as string
    const inputGstAccountId = ledgerBySystemKey.input_gst as string
    const payableAccountId = ledgerBySystemKey.supplier_payable as string
    const stockAccountId = ledgerBySystemKey.stock_in_hand as string
    const cogsAccountId = ledgerBySystemKey.cogs

    try {
      const allocatedNumber = await nextNumber.mutateAsync({
        companyId,
        financialYearId:
          activeFinancialYearId ?? company.financialYearStart,
        voucherType: isSales ? 'sales' : 'purchase',
        series,
        padLength: 4,
      })
      setVoucherNoPreview(allocatedNumber)

      if (isSales) {
        const gstPartyState = partyStateForRegion(
          region,
          placeOfSupply,
          company.stateCode,
        )
        const invoice = await postSales.mutateAsync({
          companyId,
          companyStateCode: company.stateCode,
          customerId: party.id,
          customerStateCode: gstPartyState,
          placeOfSupply,
          invoiceNumber: allocatedNumber,
          invoiceDate: voucherDate,
          dueDate: dueDate || voucherDate,
          poReference,
          transportMode,
          vehicleNo,
          lrNumber,
          challanRef,
          paymentMode,
          taxMode,
          narration,
          freight,
          packing,
          roundOff,
          billDiscount,
          godownName: godown,
          salesAccountId,
          outputGstAccountId,
          receivableAccountId,
          cashAccountId,
          cogsAccountId,
          stockAccountId,
          lines: filledLines.map((line) => ({
            itemId: line.itemId,
            description: line.itemName,
            quantity: line.quantity,
            unit: line.unit,
            rate: line.rate,
            gstRate: line.gstRate,
            discountPercent: line.discountPercent,
            godownName: line.godownName || godown,
          })),
        })
        if (sourceDocumentId) {
          await markDocumentConverted.mutateAsync({
            companyId,
            documentId: sourceDocumentId,
            invoiceId: invoice.id,
          })
          await queryClient.invalidateQueries({
            queryKey: trpc.salesDocuments.list.queryKey({ companyId }),
          })
        }
        await queryClient.invalidateQueries({
          queryKey: trpc.sales.list.queryKey({ companyId }),
        })
        setPreviewTarget({
          kind: 'sales',
          id: invoice.id,
          number: invoice.invoiceNumber,
        })
        setPreviewOpen(true)
      } else {
        const gstPartyState = partyStateForRegion(
          region,
          placeOfSupply,
          company.stateCode,
        )
        const bill = await postPurchase.mutateAsync({
          companyId,
          companyStateCode: company.stateCode,
          financialYearStart: company.financialYearStart,
          supplierId: party.id,
          supplierStateCode: gstPartyState,
          placeOfSupply,
          supplierBillNumber: supplierBillNo.trim(),
          billDate: voucherDate,
          dueDate: dueDate || voucherDate,
          poReference,
          transportMode,
          vehicleNo,
          lrNumber,
          challanRef,
          taxMode,
          narration,
          freight,
          packing,
          roundOff,
          billDiscount,
          godownName: godown,
          purchaseAccountId,
          inputGstAccountId,
          payableAccountId,
          stockAccountId,
          skipStockMovement: Boolean(sourceGrnId),
          lines: filledLines.map((line) => ({
            itemId: line.itemId,
            description: line.itemName,
            quantity: line.quantity,
            unit: line.unit,
            rate: line.rate,
            gstRate: line.gstRate,
            discountPercent: line.discountPercent,
            godownName: line.godownName || godown,
          })),
        })
        if (sourceGrnId) {
          await markGrnConverted.mutateAsync({
            companyId,
            grnId: sourceGrnId,
            billId: bill.id,
          })
          await queryClient.invalidateQueries({
            queryKey: trpc.purchaseGrns.list.queryKey({ companyId }),
          })
        }
        if (attachmentFile) {
          const buffer = await attachmentFile.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          for (const byte of bytes) {
            binary += String.fromCharCode(byte)
          }
          await createAttachment.mutateAsync({
            companyId,
            linkedDocumentType: 'purchase_bill',
            linkedDocumentId: bill.id,
            originalFilename: attachmentFile.name,
            contentType: attachmentFile.type || 'application/octet-stream',
            sizeBytes: attachmentFile.size,
            contentBase64: btoa(binary),
          })
          setAttachmentFile(null)
        }
        await queryClient.invalidateQueries({
          queryKey: trpc.purchases.list.queryKey({ companyId }),
        })
        setPreviewTarget({
          kind: 'purchase',
          id: bill.id,
          number: bill.supplierBillNumber,
        })
        setPreviewOpen(true)
      }
      await queryClient.invalidateQueries({
        queryKey: trpc.inventory.listStockBalances.queryKey({ companyId }),
      })
    } catch (error) {
      reportSaveError(error, 'Save failed')
    }
  }

  const partyOptions = parties.map((entry) => ({
    value: entry.id,
    label: entry.name,
    keywords: `${entry.gstin ?? ''} ${entry.stateCode}`,
    description: `${entry.gstin ?? 'Unregistered'} · ${stateLabel(entry.stateCode)}`,
  }))

  const itemOptions = items.map((entry) => ({
    value: entry.id,
    label: entry.name,
    keywords: entry.hsnCode,
    description: `HSN ${entry.hsnCode} · ${entry.gstRate}% · ${entry.baseUnit}`,
  }))

  const saving = postSales.isPending || postPurchase.isPending || nextNumber.isPending

  return (
    <WorkspacePage
      actions={
        <Button asChild variant="outline">
          <Link to={isSales ? '/app/sales' : '/app/purchases'}>
            Back to list
          </Link>
        </Button>
      }
      title={isSales ? 'New sales bill' : 'New purchase bill'}
    >
      <form
        className="flex flex-col gap-4 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-24"
        onSubmit={handleSave}
        ref={formRef}
      >
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Series</span>
              <Select onValueChange={setSeries} value={series}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {seriesOptions.map((entry) => (
                      <SelectItem key={entry} value={entry}>
                        {entry}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Voucher no.</span>
              <Input
                readOnly
                value={
                  voucherNoPreview === 'Auto'
                    ? `${series}-#### (auto)`
                    : voucherNoPreview
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="vch-date">
                Date
              </label>
              <Input
                id="vch-date"
                onChange={(event) => setVoucherDate(event.target.value)}
                required
                type="date"
                value={voucherDate}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {isSales ? 'Sale type' : 'Purchase type'}
              </span>
              <Select
                onValueChange={(value) => setRegion(value as SupplyRegion)}
                value={region}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="local">Local (CGST + SGST)</SelectItem>
                    <SelectItem value="central">Central (IGST)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">
                {isSales ? 'Customer' : 'Supplier'}
              </span>
              <MasterLookup
                createAction={{
                  label: isSales ? 'Add new customer…' : 'Add new supplier…',
                  onSelect: () => setPartyCreateOpen(true),
                }}
                emptyText="No contacts yet."
                onValueChange={selectParty}
                options={partyOptions}
                placeholder={`Select ${isSales ? 'customer' : 'supplier'}`}
                searchPlaceholder="Search name / GSTIN"
                title={isSales ? 'Customer lookup' : 'Supplier lookup'}
                value={partyId}
              />
            </div>
            {party ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Party GSTIN</span>
                {party.gstin ? (
                  <span className="flex h-9 items-center rounded-md border bg-muted/40 px-2.5 font-mono text-sm">
                    {party.gstin}
                  </span>
                ) : (
                  <Badge className="w-fit" variant="secondary">
                    Unregistered
                  </Badge>
                )}
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Place of supply</span>
              <Select onValueChange={setPlaceOfSupply} value={placeOfSupply}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Godown</span>
              {showLineGodown ? (
                <Select onValueChange={handleHeaderGodownChange} value={godown}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {godownNames.map((entry) => (
                        <SelectItem key={entry} value={entry}>
                          {entry}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <span className="flex h-9 items-center rounded-md border bg-muted/40 px-2.5 text-sm">
                  {godownNames[0] ?? 'Main Godown'}
                </span>
              )}
            </div>
            {party?.priceListId ? (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-sm font-medium">Price list</span>
                <span className="flex h-9 items-center rounded-md border bg-muted/40 px-2.5 text-sm">
                  Party price list active — item rates auto-apply on pick
                </span>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Tax type</span>
              <Select
                onValueChange={(value) => setTaxMode(value as TaxMode)}
                value={taxMode}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="exclusive">Item-wise (exclusive)</SelectItem>
                    <SelectItem value="inclusive">Tax inclusive</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            {isSales ? (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Payment mode</span>
                <Select
                  onValueChange={(value) =>
                    setPaymentMode(value as 'credit' | 'cash')
                  }
                  value={paymentMode}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {paymentMode === 'cash' ? (
                  <p className="text-xs text-muted-foreground">
                    Cash sales are marked paid and won&apos;t appear under
                    Payments.
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="sup-bill">
                    Supplier bill no.
                  </label>
                  <Input
                    id="sup-bill"
                    onChange={(event) => setSupplierBillNo(event.target.value)}
                    required
                    value={supplierBillNo}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="due-date">
                    Due date
                  </label>
                  <Input
                    id="due-date"
                    onChange={(event) => setDueDate(event.target.value)}
                    type="date"
                    value={dueDate}
                  />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm font-medium" htmlFor="bill-attachment">
                    Bill attachment
                  </label>
                  <Input
                    accept="image/*,.pdf"
                    id="bill-attachment"
                    onChange={(event) =>
                      setAttachmentFile(event.target.files?.[0] ?? null)
                    }
                    type="file"
                  />
                  {attachmentFile ? (
                    <p className="text-xs text-muted-foreground truncate">
                      {attachmentFile.name}
                    </p>
                  ) : null}
                </div>
              </>
            )}
        </section>

        <section className="grid gap-3 border-t pt-3 md:grid-cols-3 lg:grid-cols-6">
          {isSales ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="sales-due-date">
                Due date
              </label>
              <Input
                id="sales-due-date"
                onChange={(event) => setDueDate(event.target.value)}
                type="date"
                value={dueDate}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="po-ref">
              PO / order ref
            </label>
            <Input
              id="po-ref"
              onChange={(event) => setPoReference(event.target.value)}
              value={poReference}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="challan-ref">
              Challan ref
            </label>
            <Input
              id="challan-ref"
              onChange={(event) => setChallanRef(event.target.value)}
              value={challanRef}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="transport-mode">
              Transport
            </label>
            <Input
              id="transport-mode"
              onChange={(event) => setTransportMode(event.target.value)}
              placeholder="Road / Rail"
              value={transportMode}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="vehicle-no">
              Vehicle no.
            </label>
            <Input
              id="vehicle-no"
              onChange={(event) => setVehicleNo(event.target.value)}
              value={vehicleNo}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="lr-number">
              LR / AWB
            </label>
            <Input
              id="lr-number"
              onChange={(event) => setLrNumber(event.target.value)}
              value={lrNumber}
            />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-end gap-3">
            <Button onClick={addLine} size="sm" type="button">
              <PlusIcon data-icon="inline-start" />
              Add row
            </Button>
          </div>
          <div data-voucher-grid>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-48">Item</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  {showLineGodown ? (
                    <TableHead className="min-w-28">Godown</TableHead>
                  ) : null}
                  <TableHead>Rate</TableHead>
                  <TableHead>Disc %</TableHead>
                  <TableHead>Taxable</TableHead>
                  <TableHead>CGST</TableHead>
                  <TableHead>SGST</TableHead>
                  <TableHead>IGST</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {computedLines.map((line, rowIndex) => (
                  <TableRow key={line.key}>
                    <TableCell className="py-1">
                      <MasterLookup
                        className="h-8"
                        createAction={{
                          label: 'Add new item…',
                          onSelect: () => openItemCreate(line.key),
                        }}
                        emptyText="No items yet."
                        onFocus={() => {
                          activeRowIndexRef.current = rowIndex
                        }}
                        onValueChange={(value) => selectItem(line.key, value)}
                        options={itemOptions}
                        placeholder="Select item"
                        searchPlaceholder="Search name / HSN"
                        title="Item lookup"
                        value={line.itemId}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {line.hsnCode || '—'}
                    </TableCell>
                    <TableCell className="py-1">
                      <Input
                        className="h-8 w-20"
                        data-voucher-cell={`${rowIndex}-quantity`}
                        onChange={(event) =>
                          updateLine(line.key, {
                            quantity: event.target.value,
                          })
                        }
                        onFocus={() => {
                          activeRowIndexRef.current = rowIndex
                        }}
                        onKeyDown={(event) =>
                          handleGridKeyDown(event, rowIndex, 'quantity')
                        }
                        value={line.quantity}
                      />
                    </TableCell>
                    <TableCell>
                      {line.itemId ? (
                        <Select
                          onValueChange={(value) =>
                            selectUnit(line.key, value)
                          }
                          value={line.unit}
                        >
                          <SelectTrigger className="min-w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value={line.unit}>
                                {line.unit}
                              </SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {showLineGodown ? (
                      <TableCell className="py-1">
                        {line.itemId ? (
                          <Select
                            onValueChange={(value) =>
                              selectLineGodown(line.key, value)
                            }
                            value={line.godownName || godown}
                          >
                            <SelectTrigger className="h-8 min-w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {godownNames.map((entry) => (
                                  <SelectItem key={entry} value={entry}>
                                    {entry}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="py-1">
                      <Input
                        className="h-8 w-24"
                        data-voucher-cell={`${rowIndex}-rate`}
                        onChange={(event) =>
                          updateLine(line.key, { rate: event.target.value })
                        }
                        onFocus={() => {
                          activeRowIndexRef.current = rowIndex
                        }}
                        onKeyDown={(event) =>
                          handleGridKeyDown(event, rowIndex, 'rate')
                        }
                        value={line.rate}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <Input
                        className="h-8 w-16"
                        data-voucher-cell={`${rowIndex}-discountPercent`}
                        onChange={(event) =>
                          updateLine(line.key, {
                            discountPercent: event.target.value,
                          })
                        }
                        onFocus={() => {
                          activeRowIndexRef.current = rowIndex
                        }}
                        onKeyDown={(event) =>
                          handleGridKeyDown(event, rowIndex, 'discountPercent')
                        }
                        value={line.discountPercent}
                      />
                    </TableCell>
                    <TableCell className="py-1 text-sm">
                      {formatInr(line.taxableAmount)}
                    </TableCell>
                    <TableCell className="py-1 text-sm">
                      {formatInr(line.cgstAmount)}
                    </TableCell>
                    <TableCell className="py-1 text-sm">
                      {formatInr(line.sgstAmount)}
                    </TableCell>
                    <TableCell className="py-1 text-sm">
                      {formatInr(line.igstAmount)}
                    </TableCell>
                    <TableCell className="py-1 text-sm font-medium">
                      {formatInr(line.lineTotal)}
                    </TableCell>
                    <TableCell className="py-1">
                      <Button
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeLine(line.key)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon />
                        <span className="sr-only">Remove row</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="flex flex-col gap-3 rounded-lg bg-muted/30 p-3">
            <h2 className="text-sm font-medium">Charges & notes</h2>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="freight">
                  Freight
                </label>
                <Input
                  id="freight"
                  onChange={(event) => setFreight(event.target.value)}
                  value={freight}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="packing">
                  Packing
                </label>
                <Input
                  id="packing"
                  onChange={(event) => setPacking(event.target.value)}
                  value={packing}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="roundoff">
                  Round off
                </label>
                <Input
                  id="roundoff"
                  onChange={(event) => setRoundOff(event.target.value)}
                  value={roundOff}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="bill-discount">
                  Bill discount
                </label>
                <Input
                  id="bill-discount"
                  onChange={(event) => setBillDiscount(event.target.value)}
                  value={billDiscount}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-4">
                <label className="text-sm font-medium" htmlFor="narration">
                  Narration
                </label>
                <Textarea
                  id="narration"
                  onChange={(event) => setNarration(event.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                  value={narration}
                />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-sm font-medium">GST summary</h2>
              <p className="text-xs text-muted-foreground">
                {region === 'local' ? 'CGST + SGST' : 'IGST'}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Taxable</span>
                <span className="font-medium">
                  {formatInr(totals.taxableAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatInr(totals.cgstAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatInr(totals.sgstAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">IGST</span>
                <span>{formatInr(totals.igstAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Sundry</span>
                <span>{formatInr(totals.sundryTotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-3 text-base">
                <span className="font-medium">Grand total</span>
                <span className="font-semibold">
                  {formatInr(totals.grandTotal)}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden md:left-[var(--sidebar-width)] md:transition-[left] md:duration-200 md:ease-linear group-has-data-[state=collapsed]/sidebar-wrapper:md:left-[var(--sidebar-width-icon)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Grand total</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatInr(totals.grandTotal)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={saving} type="submit">
                {saving ? 'Saving…' : 'Save bill'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <VoucherPreviewSheet
        onOpenChange={setPreviewOpen}
        open={previewOpen}
        target={previewTarget}
      />

      <CreatePartyDialog
        defaultPartyType={isSales ? 'customer' : 'supplier'}
        lockPartyType
        onCreated={applyCreatedParty}
        onOpenChange={setPartyCreateOpen}
        open={partyCreateOpen}
      />
      <CreateItemDialog
        onCreated={handleItemCreated}
        onOpenChange={(next) => {
          setItemCreateOpen(next)
          if (!next) setItemCreateLineKey(null)
        }}
        open={itemCreateOpen}
      />
    </WorkspacePage>
  )
}
