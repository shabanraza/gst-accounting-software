import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { CardRow } from '@/components/data/card-row'
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
import { useSalesItems, useSalesParties } from '@/features/use-sales-masters'
import { formatInr } from '@/lib/format-inr'
import {
  indianStates,
  salesSeriesOptions,
  stateLabel,
} from '@/lib/india-masters'
import {
  applyItemToLine,
  buildPostSalesInvoiceInput,
  computeFormTotals,
  createEmptySalesLine,
  createInitialSalesInvoiceForm,
  filterCustomerParties,
  formRequiresInventoryLedgers,
  resolvePlaceOfSupply,
  validateLedgerMappings,
  validateSalesInvoiceForm,
  type PaymentMode,
  type SalesInvoiceFormDraft,
  type SalesInvoiceLineDraft,
  type TaxMode,
  type SupplyRegion,
} from '@/lib/sales-invoice-form'
import { supplyRegionLabel } from '@/lib/supply-region'
import { applySalesDocumentDraft } from '@/lib/voucher-prefill'
import {
  useFormPickerCoordination,
} from '@/lib/form-picker-coordination'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

type WizardStep = 'customer' | 'lines' | 'review'

const INVOICE_PICKERS = ['customer', 'place', 'series', 'godown'] as const

const INVOICE_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 'customer', label: 'Customer' },
  { id: 'lines', label: 'Items' },
  { id: 'review', label: 'Review' },
]

function countFilled(...values: Array<string | undefined>) {
  return values.filter((value) => value?.trim()).length
}

function syncPlaceOfSupply(
  form: SalesInvoiceFormDraft,
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

export function SalesInvoiceCreateScreen({
  sourceDocumentId,
}: {
  sourceDocumentId?: string
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

  const [step, setStep] = React.useState<WizardStep>('customer')
  const [form, setForm] = React.useState<SalesInvoiceFormDraft>(() =>
    createInitialSalesInvoiceForm(defaultGodown, companyStateCode ?? '27'),
  )
  const pickers = useFormPickerCoordination(INVOICE_PICKERS)
  const [error, setError] = React.useState<string | null>(null)
  const [successTarget, setSuccessTarget] =
    React.useState<VoucherSuccessTarget | null>(null)
  const [successOpen, setSuccessOpen] = React.useState(false)
  const [prefillApplied, setPrefillApplied] = React.useState(!sourceDocumentId)
  const [prefillError, setPrefillError] = React.useState<string | null>(null)

  const salesDraftQuery = useQuery({
    queryKey: ['sales-document-draft', company?.id, sourceDocumentId],
    enabled: Boolean(company?.id && sourceDocumentId && !prefillApplied),
    queryFn: () =>
      trpcClient.salesDocuments.buildInvoiceDraft.query({
        companyId: company!.id,
        documentId: sourceDocumentId!,
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
    if (salesDraftQuery.isError) {
      setPrefillError('Unable to load sales document for conversion.')
      setPrefillApplied(true)
    }
  }, [salesDraftQuery.isError])

  const { recentIds, rememberParty } = useRecentParties(company?.id, 'customer')
  const customers = filterCustomerParties(partiesQuery.data ?? [])
  const items = (itemsQuery.data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    hsnCode: item.hsnCode,
    gstRate: item.gstRate,
    baseUnit: item.baseUnit,
    rate: item.saleRate,
  }))
  const selectedCustomer = customers.find(
    (party) => party.id === form.customerId,
  )
  const totals =
    selectedCustomer && companyStateCode
      ? computeFormTotals(form, selectedCustomer.stateCode, companyStateCode)
      : null

  React.useEffect(() => {
    if (prefillApplied || !salesDraftQuery.data || !companyStateCode) {
      return
    }

    const customer = customers.find(
      (party) => party.id === salesDraftQuery.data.customerId,
    )

    setForm((current) =>
      applySalesDocumentDraft(current, salesDraftQuery.data, {
        godownName: defaultGodown,
        companyStateCode,
        partyStateCode: customer?.stateCode,
      }),
    )
    setPrefillApplied(true)
  }, [
    companyStateCode,
    customers,
    defaultGodown,
    prefillApplied,
    salesDraftQuery.data,
  ])

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!company || !companyStateCode || !selectedCustomer) {
        throw new Error('Workspace not ready')
      }

      const validationError = validateSalesInvoiceForm(
        form,
        selectedCustomer,
        companyStateCode,
      )
      if (validationError) {
        throw new Error(validationError)
      }

      const ledgerError = validateLedgerMappings(ledgerBySystemKey, {
        requiresInventoryLedgers: formRequiresInventoryLedgers(
          form,
          itemsQuery.data ?? [],
        ),
      })
      if (ledgerError) {
        throw new Error(ledgerError)
      }

      if (!activeFinancialYearId) {
        throw new Error('Financial year is not configured.')
      }

      const invoiceNumber = await trpcClient.documents.nextNumber.mutate({
        companyId: company.id,
        financialYearId: activeFinancialYearId,
        voucherType: 'sales',
        series: form.series,
        padLength: 4,
      })

      const payload = buildPostSalesInvoiceInput(form, {
        company,
        ledgerBySystemKey,
        customer: selectedCustomer,
        invoiceNumber,
        activeFinancialYearId,
      })

      return trpcClient.sales.postInvoice.mutate(payload)
    },
    onSuccess: async (invoice) => {
      if (sourceDocumentId && company) {
        await trpcClient.salesDocuments.markConverted.mutate({
          companyId: company.id,
          documentId: sourceDocumentId,
          invoiceId: invoice.id,
        })
        await queryClient.invalidateQueries({
          queryKey: ['module-list', 'sales-documents'],
        })
      }

      await queryClient.invalidateQueries({ queryKey: ['module-list', 'sales'] })
      setSuccessTarget({
        kind: 'sales',
        id: invoice.id,
        number: invoice.invoiceNumber,
        amount: invoice.totalAmount,
      })
      setSuccessOpen(true)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to post invoice.',
      )
    },
  })

  function selectCustomer(customerId: string) {
    void rememberParty(customerId)

    const customer = customers.find((entry) => entry.id === customerId)
    if (!customer || !companyStateCode) {
      setForm((current) => ({ ...current, customerId }))
      return
    }

    const nextRegion: SupplyRegion =
      customer.stateCode === companyStateCode ? 'local' : 'central'
    setForm((current) => {
      const nextForm = {
        ...current,
        customerId,
        region: nextRegion,
      }
      return {
        ...nextForm,
        placeOfSupply: syncPlaceOfSupply(
          nextForm,
          customer.stateCode,
          companyStateCode,
          nextRegion,
        ),
      }
    })
  }

  function updateRegion(region: SalesInvoiceFormDraft['region']) {
    if (!selectedCustomer || !companyStateCode) {
      setForm((current) => ({ ...current, region }))
      return
    }

    setForm((current) => {
      const nextForm = { ...current, region }
      return {
        ...nextForm,
        placeOfSupply: syncPlaceOfSupply(
          nextForm,
          selectedCustomer.stateCode,
          companyStateCode,
          region,
        ),
      }
    })
  }

  function updateLine(index: number, line: SalesInvoiceLineDraft) {
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
      lines: [...current.lines, createEmptySalesLine(current.godownName)],
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
    if (step === 'customer') {
      if (!form.customerId) {
        setError('Select a customer.')
        return
      }
      setStep('lines')
      return
    }

    if (step === 'lines') {
      const validationError = validateSalesInvoiceForm(
        form,
        selectedCustomer,
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
    (Boolean(sourceDocumentId) && !prefillApplied)
  const mastersError = partiesQuery.isError || itemsQuery.isError

  const wizardFooter =
    step === 'review' ? (
      <WizardFooter>
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
        <SecondaryButton label="Back to items" onPress={() => setStep('lines')} />
        <PrimaryButton
          label="Post invoice"
          loading={postMutation.isPending}
          disabled={postMutation.isPending}
          onPress={() => postMutation.mutate()}
        />
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
          {step !== 'customer' ? (
            <View className="flex-1">
              <SecondaryButton
                label="Back"
                onPress={() =>
                  setStep(step === 'lines' ? 'customer' : 'lines')
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
        title="New invoice"
        subtitle={
          sourceDocumentId ? 'Convert sales document to invoice' : 'Create sales invoice'
        }
        keyboardAvoiding
        footer={wizardFooter}
      >
      <StepPills step={step} steps={INVOICE_STEPS} />

      {prefillError ? <EmptyState message={prefillError} /> : null}
      {!isReady || mastersLoading ? <LoadingState /> : null}
      {workspaceError ? <EmptyState message={workspaceError} /> : null}
      {!workspaceError && isReady && !company ? (
        <EmptyState message="Set up your company before creating invoices." />
      ) : null}
      {mastersError ? (
        <EmptyState message="Unable to load customers or items." />
      ) : null}

      {isReady && company && !mastersLoading && !mastersError ? (
        <View className="gap-section-header">
          {step === 'customer' ? (
            <FormSection title="Invoice details" icon="person-outline">
              <PickerField
                label="Customer"
                value={selectedCustomer?.name}
                placeholder="Select customer"
                onPress={() => pickers.open('customer')}
              />
              <RecentPartyChips
                createHref="/(app)/parties/new"
                createLabel="Add new customer"
                parties={customers}
                recentIds={recentIds}
                selectedId={form.customerId}
                onSelect={selectCustomer}
              />
              {selectedCustomer ? (
                <View className="rounded-xl bg-muted/40 px-3 py-2">
                  <Text className="text-sm text-muted-foreground">
                    {selectedCustomer.gstin || 'Unregistered'} ·{' '}
                    {stateLabel(form.placeOfSupply)}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {supplyRegionLabel(form.region)}
                  </Text>
                </View>
              ) : null}
              <DateField
                label="Invoice date"
                value={form.invoiceDate}
                onChange={(invoiceDate) =>
                  setForm((current) => ({ ...current, invoiceDate }))
                }
              />
              <FormFieldGroup label="Payment">
                <View className="flex-row flex-wrap gap-2">
                  {(['credit', 'cash'] as Array<PaymentMode>).map((mode) => (
                    <OptionChip
                      key={mode}
                      label={mode === 'credit' ? 'Credit' : 'Cash'}
                      active={form.paymentMode === mode}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          paymentMode: mode,
                          dueDate: mode === 'cash' ? '' : current.dueDate,
                        }))
                      }
                    />
                  ))}
                </View>
              </FormFieldGroup>
              {form.paymentMode === 'credit' ? (
                <DateField
                  label="Due date"
                  value={form.dueDate}
                  onChange={(dueDate) =>
                    setForm((current) => ({ ...current, dueDate }))
                  }
                />
              ) : null}
              <CollapsibleSection defaultOpen={false} title="Tax & billing">
                <PickerField
                  label="Series"
                  value={`${form.series} · auto`}
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
                    applyItemToLine(
                      currentLine,
                      {
                        id: item.id,
                        name: item.name,
                        hsnCode: item.hsnCode,
                        gstRate: item.gstRate,
                        baseUnit: item.baseUnit,
                        saleRate: item.rate,
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
            <View className="gap-3">
              <CardRow
                title={selectedCustomer?.name ?? 'Customer'}
                subtitle={`${form.invoiceDate}${form.dueDate ? ` · Due ${form.dueDate}` : ''}`}
                badge={form.paymentMode === 'credit' ? 'Credit' : 'Cash'}
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
        visible={pickers.isOpen('customer')}
        title="Select customer"
        searchable
        searchPlaceholder="Search name / GSTIN"
        options={customers.map((party) => ({
          key: party.id,
          label: party.name,
          description: `${party.gstin ?? 'Unregistered'} · ${stateLabel(party.stateCode)}`,
          keywords: party.gstin ?? '',
        }))}
        onSelect={selectCustomer}
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
        title="Invoice series"
        options={salesSeriesOptions.map((series) => ({
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
