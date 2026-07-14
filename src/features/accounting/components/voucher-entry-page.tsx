import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDownIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible.tsx'
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
import { cn } from '#/lib/utils.ts'
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

function lineGstAmount(
  line: { cgstAmount: string; sgstAmount: string; igstAmount: string },
  region: SupplyRegion,
) {
  if (region === 'local') {
    return Number(line.cgstAmount) + Number(line.sgstAmount)
  }
  return Number(line.igstAmount)
}

function countFilled(...values: Array<string | undefined | null>) {
  return values.filter((value) => value?.trim()).length
}

const CollapsibleSectionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button> & {
    title: string
    filledCount?: number
  }
>(function CollapsibleSectionTrigger(
  { title, filledCount, className, ...props },
  ref,
) {
  return (
    <Button
      className={cn('-ml-2 h-8 gap-2 px-2 font-medium', className)}
      ref={ref}
      type="button"
      variant="ghost"
      {...props}
    >
      <ChevronDownIcon className="shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
      {title}
      {filledCount ? (
        <Badge className="font-normal" variant="secondary">
          {filledCount}
        </Badge>
      ) : null}
    </Button>
  )
})

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
          companyGstin: company.gstin,
          companyAddressLine1: company.addressLine1,
          companyAddressLine2: company.addressLine2,
          companyCity: company.city,
          companyPincode: company.pincode,
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
          companyGstin: company.gstin,
          companyAddressLine1: company.addressLine1,
          companyAddressLine2: company.addressLine2,
          companyCity: company.city,
          companyPincode: company.pincode,
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

  const transportFilledCount = countFilled(
    poReference,
    challanRef,
    transportMode,
    vehicleNo,
    lrNumber,
    isSales ? dueDate : undefined,
  )
  const chargesFilledCount = countFilled(
    narration,
    freight !== '0.00' ? freight : '',
    packing !== '0.00' ? packing : '',
    roundOff !== '0.00' ? roundOff : '',
    billDiscount !== '0.00' ? billDiscount : '',
  )

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
        <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-4">
                {isSales ? (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,12rem)_1fr] lg:items-start">
                    <div className="flex min-w-0 flex-col gap-1.5 self-start">
                      <span className="text-xs text-muted-foreground">
                        Customer
                      </span>
                      <MasterLookup
                        createAction={{
                          label: 'Add new customer…',
                          onSelect: () => setPartyCreateOpen(true),
                        }}
                        emptyText="No contacts yet."
                        onValueChange={selectParty}
                        options={partyOptions}
                        placeholder="Select customer"
                        searchPlaceholder="Search name / GSTIN"
                        title="Customer lookup"
                        value={partyId}
                      />
                      {party ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {party.gstin ? (
                            <span className="font-mono">{party.gstin}</span>
                          ) : (
                            <span>Unregistered</span>
                          )}
                          <span aria-hidden="true"> · </span>
                          <span>{stateLabel(placeOfSupply)}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      <div className="flex flex-col gap-1.5">
                        <label
                          className="text-xs text-muted-foreground"
                          htmlFor="vch-date"
                        >
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
                        <span className="text-xs text-muted-foreground">Series</span>
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
                        <span className="text-xs text-muted-foreground">
                          Supply type
                        </span>
                        <Select
                          onValueChange={(value) =>
                            setRegion(value as SupplyRegion)
                          }
                          value={region}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="local">
                                Local (CGST + SGST)
                              </SelectItem>
                              <SelectItem value="central">IGST</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Payment
                        </span>
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
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Place of supply
                        </span>
                        <Select
                          onValueChange={setPlaceOfSupply}
                          value={placeOfSupply}
                        >
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
                        <span className="text-xs text-muted-foreground">
                          Tax type
                        </span>
                        <Select
                          onValueChange={(value) => setTaxMode(value as TaxMode)}
                          value={taxMode}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="exclusive">Exclusive</SelectItem>
                              <SelectItem value="inclusive">Inclusive</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Godown
                        </span>
                        <Select
                          onValueChange={handleHeaderGodownChange}
                          value={godown}
                        >
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
                      <div className="flex flex-col justify-end gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Voucher no.
                        </span>
                        <Badge className="w-fit font-mono" variant="outline">
                          {voucherNoPreview === 'Auto'
                            ? `${series} · auto`
                            : voucherNoPreview}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,12rem)_1fr] lg:items-start">
                    <div className="flex min-w-0 flex-col gap-1.5 self-start">
                      <span className="text-xs text-muted-foreground">
                        Supplier
                      </span>
                      <MasterLookup
                        createAction={{
                          label: 'Add new supplier…',
                          onSelect: () => setPartyCreateOpen(true),
                        }}
                        emptyText="No contacts yet."
                        onValueChange={selectParty}
                        options={partyOptions}
                        placeholder="Select supplier"
                        searchPlaceholder="Search name / GSTIN"
                        title="Supplier lookup"
                        value={partyId}
                      />
                      {party ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {party.gstin ? (
                            <span className="font-mono">{party.gstin}</span>
                          ) : (
                            <span>Unregistered</span>
                          )}
                          <span aria-hidden="true"> · </span>
                          <span>{stateLabel(placeOfSupply)}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label
                          className="text-xs text-muted-foreground"
                          htmlFor="vch-date"
                        >
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
                      <div className="flex flex-col justify-end gap-1.5">
                        <span className="text-xs text-muted-foreground">
                          Voucher no.
                        </span>
                        <Badge className="w-fit font-mono" variant="outline">
                          {voucherNoPreview === 'Auto'
                            ? `${series} · auto`
                            : voucherNoPreview}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
            </section>

            {!isSales ? (
            <Collapsible
              className="group/collapsible"
              defaultOpen
            >
              <CollapsibleTrigger asChild>
                <CollapsibleSectionTrigger title="Bill options" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <section className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">Series</span>
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
                    <span className="text-xs text-muted-foreground">
                      Place of supply
                    </span>
                    <Select
                      onValueChange={setPlaceOfSupply}
                      value={placeOfSupply}
                    >
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
                    <span className="text-xs text-muted-foreground">Tax type</span>
                    <Select
                      onValueChange={(value) => setTaxMode(value as TaxMode)}
                      value={taxMode}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="exclusive">Exclusive</SelectItem>
                          <SelectItem value="inclusive">Inclusive</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-muted-foreground">Godown</span>
                    <Select
                      onValueChange={handleHeaderGodownChange}
                      value={godown}
                    >
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
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <span className="text-xs text-muted-foreground">
                        Price list
                      </span>
                      <p className="rounded-md bg-muted/40 px-2.5 py-2 text-xs text-muted-foreground">
                        Party price list — rates apply on item pick
                      </p>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="sup-bill"
                    >
                      Supplier bill no.
                    </label>
                    <Input
                      id="sup-bill"
                      onChange={(event) =>
                        setSupplierBillNo(event.target.value)
                      }
                      required
                      value={supplierBillNo}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="due-date"
                    >
                      Due date
                    </label>
                    <Input
                      id="due-date"
                      onChange={(event) => setDueDate(event.target.value)}
                      type="date"
                      value={dueDate}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="bill-attachment"
                    >
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
                      <p className="truncate text-xs text-muted-foreground">
                        {attachmentFile.name}
                      </p>
                    ) : null}
                  </div>
                </section>
              </CollapsibleContent>
            </Collapsible>
            ) : null}

            <Collapsible className="group/collapsible" defaultOpen={false}>
              <CollapsibleTrigger asChild>
                <CollapsibleSectionTrigger
                  filledCount={transportFilledCount}
                  title="Transport & references"
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <section className="grid gap-3 pt-2 sm:grid-cols-2 lg:grid-cols-3">
                  {isSales ? (
                    <div className="flex flex-col gap-1.5">
                      <label
                        className="text-xs text-muted-foreground"
                        htmlFor="sales-due-date"
                      >
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
                    <label className="text-xs text-muted-foreground" htmlFor="po-ref">
                      PO / order ref
                    </label>
                    <Input
                      id="po-ref"
                      onChange={(event) => setPoReference(event.target.value)}
                      value={poReference}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="challan-ref"
                    >
                      Challan ref
                    </label>
                    <Input
                      id="challan-ref"
                      onChange={(event) => setChallanRef(event.target.value)}
                      value={challanRef}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="transport-mode"
                    >
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
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="vehicle-no"
                    >
                      Vehicle no.
                    </label>
                    <Input
                      id="vehicle-no"
                      onChange={(event) => setVehicleNo(event.target.value)}
                      value={vehicleNo}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label
                      className="text-xs text-muted-foreground"
                      htmlFor="lr-number"
                    >
                      LR / AWB
                    </label>
                    <Input
                      id="lr-number"
                      onChange={(event) => setLrNumber(event.target.value)}
                      value={lrNumber}
                    />
                  </div>
                </section>
              </CollapsibleContent>
            </Collapsible>

        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Line items</h2>
            <Button onClick={addLine} size="sm" type="button">
              <PlusIcon data-icon="inline-start" />
              Add row
            </Button>
          </div>
          <div className="overflow-hidden rounded-md border border-border" data-voucher-grid>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead data-voucher-col="item">Item</TableHead>
                  <TableHead data-voucher-col="qty">Qty</TableHead>
                  <TableHead data-voucher-col="unit">Unit</TableHead>
                  <TableHead data-voucher-col="rate">Rate</TableHead>
                  <TableHead data-voucher-col="disc">Disc%</TableHead>
                  <TableHead data-voucher-col="taxable">Taxable</TableHead>
                  <TableHead data-voucher-col="gst">
                    {region === 'local' ? 'GST' : 'IGST'}
                  </TableHead>
                  <TableHead data-voucher-col="total">Total</TableHead>
                  <TableHead data-voucher-col="actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {computedLines.map((line, rowIndex) => (
                  <TableRow key={line.key}>
                    <TableCell data-voucher-col="item" data-voucher-grid-cell>
                      <div className="flex min-w-0 flex-col gap-0.5 py-1">
                        <MasterLookup
                          appearance="grid"
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
                        {line.hsnCode ? (
                          <span className="truncate px-2 font-mono text-[10px] text-muted-foreground">
                            HSN {line.hsnCode}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell data-voucher-col="qty" data-voucher-grid-cell>
                      <Input
                        className="tabular-nums"
                        data-voucher-cell={`${rowIndex}-quantity`}
                        data-voucher-grid-control
                        variant="grid"
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
                    <TableCell data-voucher-col="unit" data-voucher-grid-cell>
                      {line.itemId ? (
                        <Select
                          onValueChange={(value) =>
                            selectUnit(line.key, value)
                          }
                          value={line.unit}
                        >
                          <SelectTrigger data-voucher-grid-control>
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
                        <span className="block px-2 text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell data-voucher-col="rate" data-voucher-grid-cell>
                      <Input
                        className="tabular-nums"
                        data-voucher-cell={`${rowIndex}-rate`}
                        data-voucher-grid-control
                        variant="grid"
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
                    <TableCell data-voucher-col="disc" data-voucher-grid-cell>
                      <Input
                        className="tabular-nums"
                        data-voucher-cell={`${rowIndex}-discountPercent`}
                        data-voucher-grid-control
                        variant="grid"
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
                    <TableCell className="text-sm tabular-nums" data-voucher-col="taxable">
                      {formatInr(line.taxableAmount)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums" data-voucher-col="gst">
                      {formatInr(lineGstAmount(line, region))}
                    </TableCell>
                    <TableCell
                      className="text-sm font-medium tabular-nums"
                      data-voucher-col="total"
                    >
                      {formatInr(line.lineTotal)}
                    </TableCell>
                    <TableCell data-voucher-col="actions">
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

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          <Collapsible className="group/collapsible min-w-0" defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <CollapsibleSectionTrigger
                filledCount={chargesFilledCount}
                title="Charges & notes"
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <section className="grid gap-3 pt-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground" htmlFor="freight">
                    Freight
                  </label>
                  <Input
                    id="freight"
                    onChange={(event) => setFreight(event.target.value)}
                    value={freight}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground" htmlFor="packing">
                    Packing
                  </label>
                  <Input
                    id="packing"
                    onChange={(event) => setPacking(event.target.value)}
                    value={packing}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground" htmlFor="roundoff">
                    Round off
                  </label>
                  <Input
                    id="roundoff"
                    onChange={(event) => setRoundOff(event.target.value)}
                    value={roundOff}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-xs text-muted-foreground"
                    htmlFor="bill-discount"
                  >
                    Bill discount
                  </label>
                  <Input
                    id="bill-discount"
                    onChange={(event) => setBillDiscount(event.target.value)}
                    value={billDiscount}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs text-muted-foreground" htmlFor="narration">
                    Narration
                  </label>
                  <Textarea
                    id="narration"
                    onChange={(event) => setNarration(event.target.value)}
                    placeholder="Optional notes"
                    rows={2}
                    value={narration}
                  />
                </div>
              </section>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col gap-2 text-sm sm:ml-auto sm:max-w-sm sm:w-full">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-sm font-medium">GST summary</h2>
              <p className="text-xs text-muted-foreground">
                {region === 'local' ? 'CGST + SGST' : 'IGST'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Taxable</span>
                <span className="font-medium tabular-nums">
                  {formatInr(totals.taxableAmount)}
                </span>
              </div>
              {region === 'local' ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">CGST</span>
                    <span className="tabular-nums">
                      {formatInr(totals.cgstAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">SGST</span>
                    <span className="tabular-nums">
                      {formatInr(totals.sgstAmount)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">IGST</span>
                  <span className="tabular-nums">
                    {formatInr(totals.igstAmount)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Sundry</span>
                <span className="tabular-nums">
                  {formatInr(totals.sundryTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t pt-3 text-base">
                <span className="font-medium">Grand total</span>
                <span className="font-semibold tabular-nums">
                  {formatInr(totals.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden md:left-[var(--sidebar-width)] md:transition-[left] md:duration-200 md:ease-linear group-has-data-[state=collapsed]/sidebar-wrapper:md:left-[var(--sidebar-width-icon)]">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-4">
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-xs text-muted-foreground">Grand total</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatInr(totals.grandTotal)}
              </span>
            </div>
            <Button disabled={saving} type="submit">
              {saving ? 'Saving…' : 'Save bill'}
            </Button>
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
