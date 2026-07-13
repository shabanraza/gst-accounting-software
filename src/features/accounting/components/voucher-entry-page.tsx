import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
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
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useItemsList, usePartiesList } from '#/features/masters/use-master-data.ts'
import { VoucherPreviewSheet } from '#/features/documents/components/voucher-preview-sheet.tsx'
import type { VoucherPreviewTarget } from '#/features/documents/components/voucher-preview-sheet.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'
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
    trpc.documents.createAttachment.mutationOptions(),
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
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [previewTarget, setPreviewTarget] =
    React.useState<VoucherPreviewTarget | null>(null)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const activeRowIndexRef = React.useRef(0)
  const companyState = company?.stateCode ?? COMPANY_STATE_CODE

  function reportSaveError(message: string) {
    setSaveError(message)
    toast.error(message)
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
      priceListId: activePriceListId ?? '00000000-0000-4000-8000-000000000000',
    }),
    enabled: Boolean(activePriceListId) && isReady,
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

  function selectItem(key: string, itemId: string) {
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return

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
          ? 'Select a customer (add one under Masters → Customers & suppliers).'
          : 'Select a supplier (add one under Masters → Customers & suppliers).',
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

    setSaveError(null)
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
          await createAttachment.mutateAsync({
            companyId,
            linkedDocumentType: 'purchase_bill',
            linkedDocumentId: bill.id,
            originalFilename: attachmentFile.name,
            contentType: attachmentFile.type || 'application/octet-stream',
            sizeBytes: attachmentFile.size,
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
      reportSaveError(getFormErrorMessage(error, 'Save failed'))
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
      description={
        isSales
          ? 'F2 save · F2 on party/item opens lookup · Enter moves across the grid · F9 removes row'
          : 'F2 save · F2 on supplier/item opens lookup · Enter moves across the grid · F9 removes row'
      }
      title={isSales ? 'New sales bill' : 'New purchase bill'}
    >
      <form
        className="flex flex-col gap-2 pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-24"
        onSubmit={handleSave}
        ref={formRef}
      >
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono">F2</kbd>
          <span>Save bill</span>
          <span aria-hidden>·</span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono">F9</kbd>
          <span>Remove row</span>
          <span aria-hidden>·</span>
          <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono">Enter</kbd>
          <span>Next field</span>
        </div>
        <Card className="py-0">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Bill details</CardTitle>
            <CardDescription className="text-xs">
              Series, date, {isSales ? 'customer' : 'supplier'}, and GST type
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pb-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">Series</span>
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
              <span className="text-xs font-medium">Voucher no.</span>
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
              <label className="text-xs font-medium" htmlFor="vch-date">
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
              <span className="text-xs font-medium">
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
              <span className="text-xs font-medium">
                {isSales ? 'Customer' : 'Supplier'}
              </span>
              <MasterLookup
                emptyText="No contacts. Add under Customers & suppliers."
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
                <span className="text-xs font-medium">Party GSTIN</span>
                {party.gstin ? (
                  <span className="flex h-7 items-center rounded-md border bg-muted/40 px-2 font-mono text-xs">
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
              <span className="text-xs font-medium">Place of supply</span>
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
              <span className="text-xs font-medium">Default godown</span>
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
            </div>
            {party?.priceListId ? (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <span className="text-xs font-medium">Price list</span>
                <span className="flex h-7 items-center rounded-md border bg-muted/40 px-2 text-xs">
                  Party price list active — item rates auto-apply on pick
                </span>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">Tax type</span>
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
                <span className="text-xs font-medium">Payment mode</span>
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
                  <label className="text-xs font-medium" htmlFor="sup-bill">
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
                  <label className="text-xs font-medium" htmlFor="due-date">
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
                  <label className="text-xs font-medium" htmlFor="bill-attachment">
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
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 py-3">
            <div className="flex flex-col gap-0.5">
              <CardTitle className="text-base">Items</CardTitle>
              <CardDescription className="text-xs">
                Qty → Rate → Disc → next row
              </CardDescription>
            </div>
            <Button onClick={addLine} size="sm" type="button" variant="outline">
              <PlusIcon data-icon="inline-start" />
              Add row
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto px-0 pb-2" data-voucher-grid>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8 min-w-48">Item</TableHead>
                  <TableHead className="h-8">HSN</TableHead>
                  <TableHead className="h-8">Qty</TableHead>
                  <TableHead className="h-8">Unit</TableHead>
                  <TableHead className="h-8 min-w-28">Godown</TableHead>
                  <TableHead className="h-8">Rate</TableHead>
                  <TableHead className="h-8">Disc %</TableHead>
                  <TableHead className="h-8">Taxable</TableHead>
                  <TableHead className="h-8">CGST</TableHead>
                  <TableHead className="h-8">SGST</TableHead>
                  <TableHead className="h-8">IGST</TableHead>
                  <TableHead className="h-8">Total</TableHead>
                  <TableHead className="h-8 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {computedLines.map((line, rowIndex) => (
                  <TableRow key={line.key}>
                    <TableCell className="py-1">
                      <MasterLookup
                        className="h-8"
                        emptyText="No items. Add under Products & stock."
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
                    <TableCell className="font-mono text-xs">
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
                        <div className="flex flex-col gap-1">
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
                          {line.uqc ? (
                            <Badge className="w-fit" variant="outline">
                              {line.uqc}
                            </Badge>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1">
                      {line.itemId ? (
                        <Select
                          onValueChange={(value) =>
                            selectLineGodown(line.key, value)
                          }
                          value={line.godownName || godown}
                        >
                          <SelectTrigger className="min-w-28 h-8">
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
          </CardContent>
        </Card>

        <div className="grid gap-2 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="py-0">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Charges & notes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pb-4 sm:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" htmlFor="freight">
                  Freight
                </label>
                <Input
                  id="freight"
                  onChange={(event) => setFreight(event.target.value)}
                  value={freight}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" htmlFor="packing">
                  Packing
                </label>
                <Input
                  id="packing"
                  onChange={(event) => setPacking(event.target.value)}
                  value={packing}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" htmlFor="roundoff">
                  Round off
                </label>
                <Input
                  id="roundoff"
                  onChange={(event) => setRoundOff(event.target.value)}
                  value={roundOff}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" htmlFor="bill-discount">
                  Bill discount
                </label>
                <Input
                  id="bill-discount"
                  onChange={(event) => setBillDiscount(event.target.value)}
                  value={billDiscount}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-4">
                <label className="text-xs font-medium" htmlFor="narration">
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
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="py-3">
              <CardTitle className="text-base">GST summary</CardTitle>
              <CardDescription className="text-xs">
                {region === 'local' ? 'CGST + SGST' : 'IGST'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pb-4 text-sm">
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
              {saveError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {saveError}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden md:left-[var(--sidebar-width)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Grand total</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatInr(totals.grandTotal)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Press <kbd className="rounded border px-1 font-mono">F2</kbd> to save
              </span>
              <Button disabled={saving} type="submit">
                {saving ? 'Saving…' : 'Save bill (F2)'}
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
    </WorkspacePage>
  )
}
