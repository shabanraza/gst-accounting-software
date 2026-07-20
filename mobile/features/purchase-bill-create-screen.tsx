import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'

import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { CollapsibleSection } from '@/components/layout/collapsible-section'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { WizardFooter } from '@/components/layout/wizard-footer'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { OptionChip } from '@/components/ui/chip'
import { DateField } from '@/components/ui/date-field'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { StepPills } from '@/components/ui/step-pills'
import {
  VoucherSuccessSheet,
  type VoucherSuccessTarget,
} from '@/components/voucher/voucher-success-sheet'
import { AddLineButton } from '@/components/voucher/add-line-button'
import {
  RecentPartyChips,
  useRecentParties,
} from '@/components/voucher/recent-party-chips'
import { VoucherLineEditor } from '@/components/voucher/voucher-line-editor'
import { VoucherTotalsBar } from '@/components/voucher/voucher-totals-bar'
import { VoucherReviewPreview } from '@/components/voucher/voucher-review-preview'
import { useSalesItems, useSalesParties } from '@/features/use-sales-masters'
import { formatInr } from '@/lib/format-inr'
import {
  indianStates,
  purchaseSeriesOptions,
  stateLabel,
} from '@/lib/india-masters'
import {
  applyItemToPurchaseLine,
  buildPostPurchaseBillInput,
  computePurchaseFormTotals,
  createEmptyPurchaseLine,
  createInitialPurchaseBillForm,
  filterSupplierParties,
  validateActiveFinancialYearId,
  validatePurchaseBillForm,
  validatePurchaseLedgerMappings,
  type PurchaseBillFormDraft,
  type PurchaseBillLineDraft,
  type SupplyRegion,
  type TaxMode,
} from '@/lib/purchase-bill-form'
import { resolvePlaceOfSupply } from '@/lib/sales-invoice-form'
import {
  uploadPurchaseBillAttachment,
  type PurchaseAttachmentAsset,
} from '@/lib/purchase-attachment'
import { supplyRegionLabel } from '@/lib/supply-region'
import { applyGrnDraft } from '@/lib/voucher-prefill'
import {
  useFormPickerCoordination,
} from '@/lib/form-picker-coordination'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

type WizardStep = 'supplier' | 'lines' | 'review'

const PURCHASE_PICKERS = ['supplier', 'place', 'series', 'godown'] as const

const PURCHASE_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 'supplier', label: 'Supplier' },
  { id: 'lines', label: 'Items' },
  { id: 'review', label: 'Review' },
]

function countFilled(...values: Array<string | undefined>) {
  return values.filter((value) => value?.trim()).length
}

function syncPlaceOfSupply(
  form: PurchaseBillFormDraft,
  partyStateCode: string,
  companyStateCode: string,
  region = form.region,
) {
  return resolvePlaceOfSupply({
    region,
    selectedPlaceOfSupply: form.placeOfSupply,
    partyStateCode,
    companyStateCode,
  })
}

export function PurchaseBillCreateScreen({
  sourceGrnId,
}: {
  sourceGrnId?: string
} = {}) {
  const queryClient = useQueryClient()
  const {
    company,
    companyName,
    companyStateCode,
    ledgerBySystemKey,
    godowns,
    activeFinancialYearId,
    isReady,
    error: workspaceError,
  } = useWorkspace()
  const partiesQuery = useSalesParties()
  const itemsQuery = useSalesItems()

  const defaultGodown = godowns[0]?.name ?? 'Main'
  const godownNamesKey =
    godowns.length > 0
      ? godowns.map((entry) => entry.name).join('\0')
      : defaultGodown
  const godownNames = React.useMemo(() => {
    if (godowns.length > 0) {
      return godowns.map((entry) => entry.name)
    }
    return [defaultGodown]
  }, [defaultGodown, godownNamesKey])

  const [step, setStep] = React.useState<WizardStep>('supplier')
  const [form, setForm] = React.useState<PurchaseBillFormDraft>(() =>
    createInitialPurchaseBillForm(defaultGodown, companyStateCode ?? '27'),
  )
  const pickers = useFormPickerCoordination(PURCHASE_PICKERS)
  const [error, setError] = React.useState<string | null>(null)
  const [successTarget, setSuccessTarget] =
    React.useState<VoucherSuccessTarget | null>(null)
  const [successOpen, setSuccessOpen] = React.useState(false)
  const [attachmentAsset, setAttachmentAsset] =
    React.useState<PurchaseAttachmentAsset | null>(null)
  const [prefillApplied, setPrefillApplied] = React.useState(!sourceGrnId)
  const [prefillError, setPrefillError] = React.useState<string | null>(null)

  const grnDraftQuery = useQuery({
    queryKey: ['purchase-grn-draft', company?.id, sourceGrnId],
    enabled: Boolean(company?.id && sourceGrnId && !prefillApplied),
    queryFn: () =>
      trpcClient.purchaseGrns.buildBillDraft.query({
        companyId: company!.id,
        grnId: sourceGrnId!,
      }),
    retry: false,
  })

  React.useEffect(() => {
    if (!companyStateCode) return
    setForm((current) => {
      const nextGodownName = godownNames.includes(current.godownName)
        ? current.godownName
        : defaultGodown
      const nextPlaceOfSupply = current.placeOfSupply || companyStateCode
      if (
        current.godownName === nextGodownName &&
        current.placeOfSupply === nextPlaceOfSupply
      ) {
        return current
      }
      return {
        ...current,
        godownName: nextGodownName,
        placeOfSupply: nextPlaceOfSupply,
      }
    })
  }, [companyStateCode, defaultGodown, godownNames])

  React.useEffect(() => {
    if (grnDraftQuery.isError) {
      setPrefillError('Unable to load GRN for conversion.')
      setPrefillApplied(true)
    }
  }, [grnDraftQuery.isError])

  const { recentIds, rememberParty } = useRecentParties(company?.id, 'supplier')
  const suppliers = filterSupplierParties(partiesQuery.data ?? [])
  const items = (itemsQuery.data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    hsnCode: item.hsnCode,
    gstRate: item.gstRate,
    baseUnit: item.baseUnit,
    rate: item.purchaseRate,
  }))
  const selectedSupplier = suppliers.find(
    (party) => party.id === form.supplierId,
  )
  const totals =
    selectedSupplier && companyStateCode
      ? computePurchaseFormTotals(
          form,
          selectedSupplier.stateCode,
          companyStateCode,
        )
      : null

  React.useEffect(() => {
    if (prefillApplied || !grnDraftQuery.data || !companyStateCode) {
      return
    }

    const supplier = suppliers.find(
      (party) => party.id === grnDraftQuery.data.supplierId,
    )

    setForm((current) =>
      applyGrnDraft(current, grnDraftQuery.data, {
        defaultGodownName: defaultGodown,
        companyStateCode,
        partyStateCode: supplier?.stateCode,
      }),
    )
    setPrefillApplied(true)
  }, [
    companyStateCode,
    defaultGodown,
    grnDraftQuery.data,
    prefillApplied,
    suppliers,
  ])

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!company || !companyStateCode || !selectedSupplier) {
        throw new Error('Workspace not ready')
      }

      const validationError = validatePurchaseBillForm(
        form,
        selectedSupplier,
        companyStateCode,
      )
      if (validationError) {
        throw new Error(validationError)
      }

      const ledgerError = validatePurchaseLedgerMappings(ledgerBySystemKey)
      if (ledgerError) {
        throw new Error(ledgerError)
      }

      const financialYearError = validateActiveFinancialYearId(
        activeFinancialYearId,
      )
      if (financialYearError) {
        throw new Error(financialYearError)
      }

      const payload = buildPostPurchaseBillInput(form, {
        company,
        ledgerBySystemKey,
        supplier: selectedSupplier,
        skipStockMovement: Boolean(sourceGrnId),
      })

      const bill = await trpcClient.purchases.postBill.mutate(payload)

      if (sourceGrnId) {
        await trpcClient.purchaseGrns.markConverted.mutate({
          companyId: company.id,
          grnId: sourceGrnId,
          billId: bill.id,
        })
      }

      if (attachmentAsset) {
        await uploadPurchaseBillAttachment(company.id, bill.id, attachmentAsset)
      }

      return bill
    },
    onSuccess: async (bill) => {
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'purchases'],
      })
      if (sourceGrnId) {
        await queryClient.invalidateQueries({
          queryKey: ['module-list', 'purchase-grns'],
        })
      }
      setSuccessTarget({
        kind: 'purchase',
        id: bill.id,
        number: bill.supplierBillNumber,
        amount: bill.totalAmount,
      })
      setSuccessOpen(true)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to post bill.',
      )
    },
  })

  async function handleAttachmentPick(source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        setError('Camera permission is required to attach a bill photo.')
        return
      }
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setAttachmentAsset({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
      })
      setError(null)
    }
  }

  function selectSupplier(supplierId: string) {
    void rememberParty(supplierId)

    const supplier = suppliers.find((entry) => entry.id === supplierId)
    if (!supplier || !companyStateCode) {
      setForm((current) => ({ ...current, supplierId }))
      return
    }

    const nextRegion: SupplyRegion =
      supplier.stateCode === companyStateCode ? 'local' : 'central'
    const dueDate =
      supplier.paymentTermsDays && supplier.paymentTermsDays > 0
        ? (() => {
            const due = new Date()
            due.setDate(due.getDate() + supplier.paymentTermsDays!)
            return due.toISOString().slice(0, 10)
          })()
        : ''

    setForm((current) => {
      const nextForm = {
        ...current,
        supplierId,
        region: nextRegion,
        dueDate: dueDate || current.dueDate,
      }
      return {
        ...nextForm,
        placeOfSupply: syncPlaceOfSupply(
          nextForm,
          supplier.stateCode,
          companyStateCode,
          nextRegion,
        ),
      }
    })
  }

  function updateRegion(region: PurchaseBillFormDraft['region']) {
    if (!selectedSupplier || !companyStateCode) {
      setForm((current) => ({ ...current, region }))
      return
    }

    setForm((current) => {
      const nextForm = { ...current, region }
      return {
        ...nextForm,
        placeOfSupply: syncPlaceOfSupply(
          nextForm,
          selectedSupplier.stateCode,
          companyStateCode,
          region,
        ),
      }
    })
  }

  function updateLine(index: number, line: PurchaseBillLineDraft) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((entry, entryIndex) =>
        entryIndex === index ? line : entry,
      ),
    }))
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, createEmptyPurchaseLine(current.godownName)],
    }))
  }

  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, entryIndex) => entryIndex !== index),
    }))
  }

  function handleHeaderGodownChange(godownName: string) {
    setForm((current) => ({
      ...current,
      godownName,
      lines: current.lines.map((line) =>
        !line.itemId || line.godownName === current.godownName
          ? { ...line, godownName }
          : line,
      ),
    }))
  }

  function goNext() {
    setError(null)
    if (step === 'supplier') {
      if (!form.supplierId) {
        setError('Select a supplier.')
        return
      }
      if (!form.supplierBillNumber.trim()) {
        setError('Supplier bill no. is required.')
        return
      }
      setStep('lines')
      return
    }

    if (step === 'lines') {
      const validationError = validatePurchaseBillForm(
        form,
        selectedSupplier,
        companyStateCode ?? '',
      )
      if (validationError) {
        setError(validationError)
        return
      }
      setStep('review')
    }
  }

  const mastersLoading =
    partiesQuery.isLoading ||
    itemsQuery.isLoading ||
    (Boolean(sourceGrnId) && !prefillApplied)
  const mastersError = partiesQuery.isError || itemsQuery.isError

  const wizardFooter =
    step === 'review' ? (
      <WizardFooter>
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <SecondaryButton label="Back" onPress={() => setStep('lines')} />
          </View>
          <View className="flex-1">
            <PrimaryButton
              label="Post bill"
              loading={postMutation.isPending}
              disabled={postMutation.isPending}
              onPress={() => postMutation.mutate()}
            />
          </View>
        </View>
      </WizardFooter>
    ) : (
      <WizardFooter>
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
        {step === 'lines' && totals ? (
          <VoucherTotalsBar
            taxableAmount={totals.taxableAmount}
            gstAmount={totals.totalGstAmount}
            grandTotal={totals.grandTotal}
          />
        ) : null}
        <View className="flex-row gap-3">
          {step !== 'supplier' ? (
            <View className="flex-1">
              <SecondaryButton
                label="Back"
                onPress={() =>
                  setStep(step === 'lines' ? 'supplier' : 'lines')
                }
              />
            </View>
          ) : null}
          <View className="flex-1">
            <PrimaryButton label="Next" onPress={goNext} />
          </View>
        </View>
      </WizardFooter>
    )

  return (
      <Screen
        title="New purchase bill"
        subtitle={
          sourceGrnId ? 'Convert GRN to purchase bill' : 'Create purchase bill'
        }
        keyboardAvoiding
        headerTone="brand"
        headerContent={<StepPills step={step} steps={PURCHASE_STEPS} tone="brand" />}
        footer={wizardFooter}
      >
      {prefillError ? <EmptyState message={prefillError} /> : null}
      {!isReady || mastersLoading ? <LoadingState /> : null}
      {workspaceError ? <EmptyState message={workspaceError} /> : null}
      {!workspaceError && isReady && !company ? (
        <EmptyState message="Set up your company before creating purchase bills." />
      ) : null}
      {mastersError ? (
        <EmptyState message="Unable to load suppliers or items." />
      ) : null}

      {isReady && company && !mastersLoading && !mastersError ? (
        <View className="gap-section-header">
          {step === 'supplier' ? (
            <FormSection title="Bill details" icon="business-outline">
              <PickerField
                label="Supplier"
                value={selectedSupplier?.name}
                placeholder="Select supplier"
                onPress={() => pickers.open('supplier')}
              />
              <RecentPartyChips
                createHref="/(app)/parties/new"
                createLabel="Add new supplier"
                parties={suppliers}
                recentIds={recentIds}
                selectedId={form.supplierId}
                onSelect={selectSupplier}
              />
              {selectedSupplier ? (
                <View className="rounded-xl bg-muted/40 px-3 py-2">
                  <Text className="text-sm text-muted-foreground">
                    {selectedSupplier.gstin || 'Unregistered'} ·{' '}
                    {stateLabel(form.placeOfSupply)}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {supplyRegionLabel(form.region)}
                  </Text>
                </View>
              ) : null}
              <DateField
                label="Bill date"
                value={form.billDate}
                onChange={(billDate) =>
                  setForm((current) => ({ ...current, billDate }))
                }
              />
              <FormFieldGroup label="Supplier bill no.">
                <FormField
                  placeholder="Required"
                  value={form.supplierBillNumber}
                  onChangeText={(supplierBillNumber) =>
                    setForm((current) => ({ ...current, supplierBillNumber }))
                  }
                />
              </FormFieldGroup>
              <View className="gap-2">
                <Text className="text-sm text-muted-foreground">
                  Bill attachment
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <SecondaryButton
                      label="Camera"
                      onPress={() => void handleAttachmentPick('camera')}
                    />
                  </View>
                  <View className="flex-1">
                    <SecondaryButton
                      label="Gallery"
                      onPress={() => void handleAttachmentPick('library')}
                    />
                  </View>
                </View>
                {attachmentAsset ? (
                  <Text className="text-sm text-foreground">
                    {attachmentAsset.fileName ?? 'Attached image'}
                  </Text>
                ) : (
                  <Text className="text-sm text-muted-foreground">
                    Optional supplier bill photo or scan
                  </Text>
                )}
              </View>
              <CollapsibleSection defaultOpen={false} title="Tax & billing">
                <PickerField
                  label="Series"
                  value={form.series}
                  onPress={() => pickers.open('series')}
                />
                <PickerField
                  label="Place of supply"
                  value={stateLabel(form.placeOfSupply)}
                  onPress={() => pickers.open('place')}
                />
                <View className="gap-2">
                  <Text className="text-sm text-muted-foreground">
                    Supply type
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <OptionChip
                      label="Local (CGST+SGST)"
                      active={form.region === 'local'}
                      onPress={() => updateRegion('local')}
                    />
                    <OptionChip
                      label="IGST"
                      active={form.region === 'central'}
                      onPress={() => updateRegion('central')}
                    />
                  </View>
                </View>
                <View className="gap-2">
                  <Text className="text-sm text-muted-foreground">Tax type</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {(['exclusive', 'inclusive'] as Array<TaxMode>).map(
                      (mode) => (
                        <OptionChip
                          key={mode}
                          label={mode === 'exclusive' ? 'Exclusive' : 'Inclusive'}
                          active={form.taxMode === mode}
                          onPress={() =>
                            setForm((current) => ({ ...current, taxMode: mode }))
                          }
                        />
                      ),
                    )}
                  </View>
                </View>
                <PickerField
                  label="Godown"
                  value={form.godownName}
                  onPress={() => pickers.open('godown')}
                />
                <View>
                  <DateField
                    label="Due date"
                    value={form.dueDate}
                    onChange={(dueDate) =>
                      setForm((current) => ({ ...current, dueDate }))
                    }
                  />
                </View>
              </CollapsibleSection>
            </FormSection>
          ) : null}

          {step === 'lines' ? (
            <View className="gap-section-header">
              {form.lines.map((line, index) => (
                <VoucherLineEditor
                  key={line.key}
                  line={line}
                  index={index}
                  godownNames={godownNames}
                  items={items}
                  onChange={(nextLine) => updateLine(index, nextLine)}
                  onRemove={() => removeLine(index)}
                  canRemove={form.lines.length > 1}
                  applyItem={(currentLine, item) =>
                    applyItemToPurchaseLine(
                      currentLine,
                      {
                        id: item.id,
                        name: item.name,
                        hsnCode: item.hsnCode,
                        gstRate: item.gstRate,
                        baseUnit: item.baseUnit,
                        purchaseRate: item.rate,
                      },
                      form.godownName,
                    )
                  }
                />
              ))}
              <AddLineButton onPress={addLine} />

              <CollapsibleSection
                defaultOpen={false}
                filledCount={countFilled(
                  form.poReference,
                  form.challanRef,
                  form.transportMode,
                  form.vehicleNo,
                  form.lrNumber,
                )}
                title="Transport & references"
              >
                <FormFieldGroup label="PO / order ref">
                  <FormField
                    value={form.poReference}
                    onChangeText={(poReference) =>
                      setForm((current) => ({ ...current, poReference }))
                    }
                  />
                </FormFieldGroup>
                <FormFieldGroup label="Challan ref">
                  <FormField
                    value={form.challanRef}
                    onChangeText={(challanRef) =>
                      setForm((current) => ({ ...current, challanRef }))
                    }
                  />
                </FormFieldGroup>
                <FormFieldGroup label="Transport">
                  <FormField
                    placeholder="Road / Rail"
                    value={form.transportMode}
                    onChangeText={(transportMode) =>
                      setForm((current) => ({ ...current, transportMode }))
                    }
                  />
                </FormFieldGroup>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormFieldGroup label="Vehicle no.">
                      <FormField
                        value={form.vehicleNo}
                        onChangeText={(vehicleNo) =>
                          setForm((current) => ({ ...current, vehicleNo }))
                        }
                      />
                    </FormFieldGroup>
                  </View>
                  <View className="flex-1">
                    <FormFieldGroup label="LR / AWB">
                      <FormField
                        value={form.lrNumber}
                        onChangeText={(lrNumber) =>
                          setForm((current) => ({ ...current, lrNumber }))
                        }
                      />
                    </FormFieldGroup>
                  </View>
                </View>
              </CollapsibleSection>

              <CollapsibleSection
                defaultOpen={false}
                filledCount={countFilled(
                  form.freight,
                  form.packing,
                  form.roundOff,
                  form.billDiscount,
                  form.narration,
                )}
                title="Charges & notes"
              >
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormFieldGroup label="Freight">
                      <FormField
                        keyboardType="decimal-pad"
                        value={form.freight}
                        onChangeText={(freight) =>
                          setForm((current) => ({ ...current, freight }))
                        }
                      />
                    </FormFieldGroup>
                  </View>
                  <View className="flex-1">
                    <FormFieldGroup label="Packing">
                      <FormField
                        keyboardType="decimal-pad"
                        value={form.packing}
                        onChangeText={(packing) =>
                          setForm((current) => ({ ...current, packing }))
                        }
                      />
                    </FormFieldGroup>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <FormFieldGroup label="Round off">
                      <FormField
                        keyboardType="decimal-pad"
                        value={form.roundOff}
                        onChangeText={(roundOff) =>
                          setForm((current) => ({ ...current, roundOff }))
                        }
                      />
                    </FormFieldGroup>
                  </View>
                  <View className="flex-1">
                    <FormFieldGroup label="Bill discount">
                      <FormField
                        keyboardType="decimal-pad"
                        value={form.billDiscount}
                        onChangeText={(billDiscount) =>
                          setForm((current) => ({ ...current, billDiscount }))
                        }
                      />
                    </FormFieldGroup>
                  </View>
                </View>
                <FormFieldGroup label="Narration">
                  <FormField
                    placeholder="Optional notes"
                    value={form.narration}
                    onChangeText={(narration) =>
                      setForm((current) => ({ ...current, narration }))
                    }
                  />
                </FormFieldGroup>
              </CollapsibleSection>
            </View>
          ) : null}

          {step === 'review' ? (
            <VoucherReviewPreview
              title="Purchase bill"
              partyName={selectedSupplier?.name ?? 'Supplier'}
              documentDate={form.billDate}
              documentMeta={form.supplierBillNumber}
              placeOfSupply={stateLabel(form.placeOfSupply)}
              lines={form.lines
                .filter((line) => line.itemId)
                .map((line) => ({
                  key: line.key,
                  name: line.itemName,
                  detail: `${line.quantity} ${line.unit} × ${formatInr(line.rate)}${Number(line.discountPercent) > 0 ? ` · Disc ${line.discountPercent}%` : ''}`,
                  badge: `GST ${line.gstRate}%`,
                  amount: formatInr(Number(line.quantity) * Number(line.rate)),
                }))}
              taxableAmount={totals?.taxableAmount}
              gstAmount={totals?.totalGstAmount}
              grandTotal={totals?.grandTotal}
            />
          ) : null}
        </View>
      ) : null}

      <PickerModal
        visible={pickers.isOpen('supplier')}
        title="Select supplier"
        searchable
        searchPlaceholder="Search name / GSTIN"
        options={suppliers.map((party) => ({
          key: party.id,
          label: party.name,
          description: `${party.gstin ?? 'Unregistered'} · ${stateLabel(party.stateCode)}`,
          keywords: party.gstin ?? '',
        }))}
        onSelect={selectSupplier}
        onClose={pickers.closeAll}
      />
      <PickerModal
        visible={pickers.isOpen('place')}
        title="Place of supply"
        searchable
        searchPlaceholder="Search state"
        options={indianStates.map((state) => ({
          key: state.code,
          label: `${state.name} (${state.code})`,
        }))}
        onSelect={(placeOfSupply) =>
          setForm((current) => ({ ...current, placeOfSupply }))
        }
        onClose={pickers.closeAll}
      />
      <PickerModal
        visible={pickers.isOpen('series')}
        title="Bill series"
        options={purchaseSeriesOptions.map((series) => ({
          key: series,
          label: series,
        }))}
        onSelect={(series) => setForm((current) => ({ ...current, series }))}
        onClose={pickers.closeAll}
      />
      <PickerModal
        visible={pickers.isOpen('godown')}
        title="Default godown"
        options={godownNames.map((name) => ({ key: name, label: name }))}
        onSelect={handleHeaderGodownChange}
        onClose={pickers.closeAll}
      />

      <VoucherSuccessSheet
        open={successOpen}
        onOpenChange={setSuccessOpen}
        target={successTarget}
        companyName={companyName ?? company?.tradeName ?? 'Company'}
      />
    </Screen>
  )
}
