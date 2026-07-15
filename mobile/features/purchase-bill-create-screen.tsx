import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pressable } from 'react-native'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { WizardFooter } from '@/components/layout/wizard-footer'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { OptionChip } from '@/components/ui/chip'
import { FormField } from '@/components/ui/form-field'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { StepPills } from '@/components/ui/step-pills'
import {
  VoucherSuccessSheet,
  type VoucherSuccessTarget,
} from '@/components/voucher/voucher-success-sheet'
import { VoucherLineEditor } from '@/components/voucher/voucher-line-editor'
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
import { trpcClient } from '@/lib/trpc-client'
import { themeColors } from '@/lib/theme'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

type WizardStep = 'supplier' | 'lines' | 'review'

const PURCHASE_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 'supplier', label: 'Supplier' },
  { id: 'lines', label: 'Items' },
  { id: 'review', label: 'Review' },
]

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

export function PurchaseBillCreateScreen() {
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
  const godownNames =
    godowns.length > 0 ? godowns.map((entry) => entry.name) : [defaultGodown]

  const [step, setStep] = React.useState<WizardStep>('supplier')
  const [form, setForm] = React.useState<PurchaseBillFormDraft>(() =>
    createInitialPurchaseBillForm(defaultGodown, companyStateCode ?? '27'),
  )
  const [supplierPickerOpen, setSupplierPickerOpen] = React.useState(false)
  const [placePickerOpen, setPlacePickerOpen] = React.useState(false)
  const [seriesPickerOpen, setSeriesPickerOpen] = React.useState(false)
  const [godownPickerOpen, setGodownPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [successTarget, setSuccessTarget] =
    React.useState<VoucherSuccessTarget | null>(null)
  const [successOpen, setSuccessOpen] = React.useState(false)

  React.useEffect(() => {
    if (!companyStateCode) return
    setForm((current) => ({
      ...current,
      godownName: godownNames.includes(current.godownName)
        ? current.godownName
        : defaultGodown,
      placeOfSupply: current.placeOfSupply || companyStateCode,
    }))
  }, [companyStateCode, defaultGodown, godownNames])

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
      })

      return trpcClient.purchases.postBill.mutate(payload)
    },
    onSuccess: async (bill) => {
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'purchases'],
      })
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

  function selectSupplier(supplierId: string) {
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

  const mastersLoading = partiesQuery.isLoading || itemsQuery.isLoading
  const mastersError = partiesQuery.isError || itemsQuery.isError

  const wizardFooter =
    step === 'review' ? (
      <WizardFooter>
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
        <SecondaryButton label="Back to items" onPress={() => setStep('lines')} />
        <PrimaryButton
          label={postMutation.isPending ? 'Posting…' : 'Post bill'}
          loading={postMutation.isPending}
          disabled={postMutation.isPending}
          onPress={() => postMutation.mutate()}
        />
      </WizardFooter>
    ) : (
      <WizardFooter>
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
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
      subtitle="Create purchase bill"
      keyboardAvoiding
      footer={wizardFooter}
    >
      <StepPills step={step} steps={PURCHASE_STEPS} />

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
            <>
              <FormSection title="Bill details" icon="business-outline">
                <PickerField
                  label="Supplier"
                  value={selectedSupplier?.name}
                  placeholder="Select supplier"
                  onPress={() => setSupplierPickerOpen(true)}
                />
                {selectedSupplier ? (
                  <Text className="text-sm text-muted-foreground">
                    {selectedSupplier.gstin || 'Unregistered'} ·{' '}
                    {stateLabel(form.placeOfSupply)}
                  </Text>
                ) : null}
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">
                    Bill date
                  </Text>
                  <FormField
                    placeholder="YYYY-MM-DD"
                    value={form.billDate}
                    onChangeText={(billDate) =>
                      setForm((current) => ({ ...current, billDate }))
                    }
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">
                    Supplier bill no.
                  </Text>
                  <FormField
                    placeholder="Required"
                    value={form.supplierBillNumber}
                    onChangeText={(supplierBillNumber) =>
                      setForm((current) => ({ ...current, supplierBillNumber }))
                    }
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">
                    Due date
                  </Text>
                  <FormField
                    placeholder="YYYY-MM-DD"
                    value={form.dueDate}
                    onChangeText={(dueDate) =>
                      setForm((current) => ({ ...current, dueDate }))
                    }
                  />
                </View>
                <PickerField
                  label="Series"
                  value={form.series}
                  onPress={() => setSeriesPickerOpen(true)}
                />
              </FormSection>

              <FormSection title="Bill options" icon="options-outline">
                <PickerField
                  label="Place of supply"
                  value={stateLabel(form.placeOfSupply)}
                  onPress={() => setPlacePickerOpen(true)}
                />
                <View className="gap-2">
                  <Text className="text-sm text-muted-foreground">Supply type</Text>
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
                  onPress={() => setGodownPickerOpen(true)}
                />
              </FormSection>
            </>
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
              <Pressable
                className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary bg-primary/5 px-4 py-3"
                onPress={addLine}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color={themeColors.primary}
                />
                <Text className="font-semibold text-primary">Add line</Text>
              </Pressable>

              <FormSection title="Transport & references" icon="car-outline">
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">
                    PO / order ref
                  </Text>
                  <FormField
                    value={form.poReference}
                    onChangeText={(poReference) =>
                      setForm((current) => ({ ...current, poReference }))
                    }
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">
                    Challan ref
                  </Text>
                  <FormField
                    value={form.challanRef}
                    onChangeText={(challanRef) =>
                      setForm((current) => ({ ...current, challanRef }))
                    }
                  />
                </View>
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">
                    Transport
                  </Text>
                  <FormField
                    placeholder="Road / Rail"
                    value={form.transportMode}
                    onChangeText={(transportMode) =>
                      setForm((current) => ({ ...current, transportMode }))
                    }
                  />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mb-1 text-sm text-muted-foreground">
                      Vehicle no.
                    </Text>
                    <FormField
                      value={form.vehicleNo}
                      onChangeText={(vehicleNo) =>
                        setForm((current) => ({ ...current, vehicleNo }))
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-sm text-muted-foreground">
                      LR / AWB
                    </Text>
                    <FormField
                      value={form.lrNumber}
                      onChangeText={(lrNumber) =>
                        setForm((current) => ({ ...current, lrNumber }))
                      }
                    />
                  </View>
                </View>
              </FormSection>

              <FormSection title="Charges & notes" icon="receipt-outline">
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mb-1 text-sm text-muted-foreground">
                      Freight
                    </Text>
                    <FormField
                      keyboardType="decimal-pad"
                      value={form.freight}
                      onChangeText={(freight) =>
                        setForm((current) => ({ ...current, freight }))
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-sm text-muted-foreground">
                      Packing
                    </Text>
                    <FormField
                      keyboardType="decimal-pad"
                      value={form.packing}
                      onChangeText={(packing) =>
                        setForm((current) => ({ ...current, packing }))
                      }
                    />
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="mb-1 text-sm text-muted-foreground">
                      Round off
                    </Text>
                    <FormField
                      keyboardType="decimal-pad"
                      value={form.roundOff}
                      onChangeText={(roundOff) =>
                        setForm((current) => ({ ...current, roundOff }))
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="mb-1 text-sm text-muted-foreground">
                      Bill discount
                    </Text>
                    <FormField
                      keyboardType="decimal-pad"
                      value={form.billDiscount}
                      onChangeText={(billDiscount) =>
                        setForm((current) => ({ ...current, billDiscount }))
                      }
                    />
                  </View>
                </View>
                <View>
                  <Text className="mb-1 text-sm text-muted-foreground">
                    Narration
                  </Text>
                  <FormField
                    placeholder="Optional notes"
                    value={form.narration}
                    onChangeText={(narration) =>
                      setForm((current) => ({ ...current, narration }))
                    }
                  />
                </View>
              </FormSection>

              {totals ? (
                <FormSection title="GST summary" icon="calculator-outline">
                  <CardRow
                    title="Taxable"
                    amount={formatInr(totals.taxableAmount)}
                  />
                  {form.region === 'local' ? (
                    <>
                      <CardRow title="CGST" amount={formatInr(totals.cgstAmount)} />
                      <CardRow title="SGST" amount={formatInr(totals.sgstAmount)} />
                    </>
                  ) : (
                    <CardRow title="IGST" amount={formatInr(totals.igstAmount)} />
                  )}
                  <CardRow title="Sundry" amount={formatInr(totals.sundryTotal)} />
                  <CardRow
                    title="Grand total"
                    amount={formatInr(totals.grandTotal)}
                  />
                </FormSection>
              ) : null}
            </View>
          ) : null}

          {step === 'review' ? (
            <View className="gap-3">
              <CardRow
                title={selectedSupplier?.name ?? 'Supplier'}
                subtitle={`${form.billDate} · ${form.supplierBillNumber}`}
              />
              <CardRow
                title="Place of supply"
                subtitle={stateLabel(form.placeOfSupply)}
              />
              {form.lines
                .filter((line) => line.itemId)
                .map((line) => (
                  <CardRow
                    key={line.key}
                    title={line.itemName}
                    subtitle={`${line.quantity} ${line.unit} × ${formatInr(line.rate)}${Number(line.discountPercent) > 0 ? ` · Disc ${line.discountPercent}%` : ''}`}
                    badge={`GST ${line.gstRate}%`}
                  />
                ))}
              {totals ? (
                <>
                  <CardRow
                    title="Taxable amount"
                    amount={formatInr(totals.taxableAmount)}
                  />
                  <CardRow title="GST" amount={formatInr(totals.totalGstAmount)} />
                  <CardRow
                    title="Grand total"
                    amount={formatInr(totals.grandTotal)}
                  />
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <PickerModal
        visible={supplierPickerOpen}
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
        onClose={() => setSupplierPickerOpen(false)}
      />
      <PickerModal
        visible={placePickerOpen}
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
        onClose={() => setPlacePickerOpen(false)}
      />
      <PickerModal
        visible={seriesPickerOpen}
        title="Bill series"
        options={purchaseSeriesOptions.map((series) => ({
          key: series,
          label: series,
        }))}
        onSelect={(series) => setForm((current) => ({ ...current, series }))}
        onClose={() => setSeriesPickerOpen(false)}
      />
      <PickerModal
        visible={godownPickerOpen}
        title="Default godown"
        options={godownNames.map((name) => ({ key: name, label: name }))}
        onSelect={handleHeaderGodownChange}
        onClose={() => setGodownPickerOpen(false)}
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
