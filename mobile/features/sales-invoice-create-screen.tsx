import { Ionicons } from '@expo/vector-icons'
import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Pressable } from 'react-native'

import { CardRow } from '@/components/data/card-row'
import { DetailCard } from '@/components/data/detail-card'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { Screen } from '@/components/layout/screen'
import { WizardFooter } from '@/components/layout/wizard-footer'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { OptionChip } from '@/components/ui/chip'
import { FormField } from '@/components/ui/form-field'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { StepPills } from '@/components/ui/step-pills'
import { useSalesItems, useSalesParties } from '@/features/use-sales-masters'
import { formatInr } from '@/lib/format-inr'
import {
  DEFAULT_SALES_SERIES,
  applyItemToLine,
  buildPostSalesInvoiceInput,
  computeFormTotals,
  createEmptySalesLine,
  createInitialSalesInvoiceForm,
  filterCustomerParties,
  formRequiresInventoryLedgers,
  validateLedgerMappings,
  validateSalesInvoiceForm,
  type PaymentMode,
  type SalesInvoiceFormDraft,
  type SalesInvoiceLineDraft,
  type SalesItemLike,
} from '@/lib/sales-invoice-form'
import { trpcClient } from '@/lib/trpc-client'
import { themeColors } from '@/lib/theme'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

type WizardStep = 'customer' | 'lines' | 'review'

const INVOICE_STEPS: Array<{ id: WizardStep; label: string }> = [
  { id: 'customer', label: 'Customer' },
  { id: 'lines', label: 'Items' },
  { id: 'review', label: 'Review' },
]

function LineItemEditor({
  line,
  index,
  godownName,
  items,
  onChange,
  onRemove,
  canRemove,
}: {
  line: SalesInvoiceLineDraft
  index: number
  godownName: string
  items: Array<SalesItemLike>
  onChange: (line: SalesInvoiceLineDraft) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const [pickerOpen, setPickerOpen] = React.useState(false)

  const lineAmount =
    Number(line.quantity) > 0 && Number(line.rate) >= 0
      ? Number(line.quantity) * Number(line.rate)
      : null

  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-card-padding">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-foreground">Line {index + 1}</Text>
        <View className="flex-row items-center gap-3">
          {lineAmount !== null ? (
            <Text className="font-semibold text-foreground">
              {formatInr(String(lineAmount))}
            </Text>
          ) : null}
          {canRemove ? (
            <Pressable onPress={onRemove}>
              <Text className="text-sm font-medium text-destructive">Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Pressable
        className="rounded-xl border border-border bg-background px-4 py-3"
        onPress={() => setPickerOpen(true)}
      >
        <Text className="text-sm text-muted-foreground">Item</Text>
        <Text className="font-medium text-foreground">
          {line.itemName || 'Select item'}
        </Text>
      </Pressable>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="mb-1 text-sm text-muted-foreground">Quantity</Text>
          <FormField
            keyboardType="decimal-pad"
            value={line.quantity}
            onChangeText={(quantity) => onChange({ ...line, quantity })}
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-sm text-muted-foreground">Rate</Text>
          <FormField
            keyboardType="decimal-pad"
            value={line.rate}
            onChangeText={(rate) => onChange({ ...line, rate })}
          />
        </View>
      </View>
      {line.itemId ? (
        <Text className="text-sm text-muted-foreground">
          GST {line.gstRate}% · {line.unit}
        </Text>
      ) : null}
      <PickerModal
        visible={pickerOpen}
        title="Select item"
        options={items.map((item) => ({ key: item.id, label: item.name }))}
        onSelect={(itemId) => {
          const item = items.find((entry) => entry.id === itemId)
          if (!item) return
          onChange(applyItemToLine(line, item, godownName))
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  )
}

export function SalesInvoiceCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const {
    company,
    companyStateCode,
    ledgerBySystemKey,
    godowns,
    activeFinancialYearId,
    isReady,
  } = useWorkspace()
  const partiesQuery = useSalesParties()
  const itemsQuery = useSalesItems()

  const defaultGodown = godowns[0]?.name ?? 'Main'
  const [step, setStep] = React.useState<WizardStep>('customer')
  const [form, setForm] = React.useState<SalesInvoiceFormDraft>(() =>
    createInitialSalesInvoiceForm(defaultGodown),
  )
  const [customerPickerOpen, setCustomerPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (defaultGodown && form.godownName !== defaultGodown && !godowns.length) {
      return
    }
    if (defaultGodown && form.godownName === 'Main' && defaultGodown !== 'Main') {
      setForm(createInitialSalesInvoiceForm(defaultGodown))
    }
  }, [defaultGodown, form.godownName, godowns.length])

  const customers = filterCustomerParties(partiesQuery.data ?? [])
  const items = itemsQuery.data ?? []
  const selectedCustomer = customers.find(
    (party) => party.id === form.customerId,
  )
  const totals =
    selectedCustomer && companyStateCode
      ? computeFormTotals(form, selectedCustomer.stateCode, companyStateCode)
      : null

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
        requiresInventoryLedgers: formRequiresInventoryLedgers(form, items),
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
        series: DEFAULT_SALES_SERIES,
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
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'sales'] })
      router.replace(`/(app)/sales/${invoice.id}` as never)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to post invoice.',
      )
    },
  })

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

  const mastersLoading = partiesQuery.isLoading || itemsQuery.isLoading
  const mastersError = partiesQuery.isError || itemsQuery.isError

  const wizardFooter =
    step === 'review' ? (
      <WizardFooter>
        <SecondaryButton label="Back to items" onPress={() => setStep('lines')} />
        <PrimaryButton
          label={postMutation.isPending ? 'Posting…' : 'Post invoice'}
          loading={postMutation.isPending}
          disabled={postMutation.isPending}
          onPress={() => postMutation.mutate()}
        />
      </WizardFooter>
    ) : (
      <WizardFooter>
        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
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
      subtitle="Create sales invoice"
      keyboardAvoiding
      footer={wizardFooter}
    >
      <StepPills step={step} steps={INVOICE_STEPS} />

      {!isReady || mastersLoading ? <LoadingState /> : null}
      {mastersError ? (
        <EmptyState message="Unable to load customers or items." />
      ) : null}

      {step === 'customer' ? (
        <DetailCard title="Invoice details" icon="person-outline">
          <View className="gap-3">
            <PickerField
              label="Customer"
              value={selectedCustomer?.name}
              placeholder="Select customer"
              onPress={() => setCustomerPickerOpen(true)}
            />
            <View>
              <Text className="mb-1 text-sm text-muted-foreground">Invoice date</Text>
              <FormField
                placeholder="YYYY-MM-DD"
                value={form.invoiceDate}
                onChangeText={(invoiceDate) =>
                  setForm((current) => ({ ...current, invoiceDate }))
                }
              />
            </View>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">Payment mode</Text>
              <View className="flex-row flex-wrap gap-2">
                {(['credit', 'cash'] as Array<PaymentMode>).map((mode) => (
                  <OptionChip
                    key={mode}
                    label={mode === 'credit' ? 'Credit' : 'Cash'}
                    active={form.paymentMode === mode}
                    onPress={() =>
                      setForm((current) => ({ ...current, paymentMode: mode }))
                    }
                  />
                ))}
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm text-muted-foreground">Supply</Text>
              <View className="flex-row flex-wrap gap-2">
                <OptionChip
                  label="Local"
                  active={form.region === 'local'}
                  onPress={() =>
                    setForm((current) => ({ ...current, region: 'local' }))
                  }
                />
                <OptionChip
                  label="Inter-state"
                  active={form.region === 'central'}
                  onPress={() =>
                    setForm((current) => ({ ...current, region: 'central' }))
                  }
                />
              </View>
            </View>
            <View>
              <Text className="mb-1 text-sm text-muted-foreground">Narration</Text>
              <FormField
                placeholder="Optional note"
                value={form.narration}
                onChangeText={(narration) =>
                  setForm((current) => ({ ...current, narration }))
                }
              />
            </View>
          </View>
        </DetailCard>
      ) : null}

      {step === 'lines' ? (
        <View className="gap-3">
          {form.lines.map((line, index) => (
            <LineItemEditor
              key={line.key}
              line={line}
              index={index}
              godownName={form.godownName}
              items={items}
              onChange={(nextLine) => updateLine(index, nextLine)}
              onRemove={() => removeLine(index)}
              canRemove={form.lines.length > 1}
            />
          ))}
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-primary bg-primary/5 px-4 py-3"
            onPress={addLine}
          >
            <Ionicons name="add-circle-outline" size={20} color={themeColors.primary} />
            <Text className="font-semibold text-primary">Add line</Text>
          </Pressable>
          {totals ? (
            <CardRow
              title="Subtotal"
              amount={formatInr(totals.grandTotal)}
              subtitle={`${totals.lineCount} line(s) · GST ${formatInr(totals.totalGstAmount)}`}
            />
          ) : null}
        </View>
      ) : null}

      {step === 'review' ? (
        <View className="gap-3">
          <CardRow
            title={selectedCustomer?.name ?? 'Customer'}
            subtitle={form.invoiceDate}
            badge={form.paymentMode === 'credit' ? 'Credit' : 'Cash'}
          />
          {form.lines
            .filter((line) => line.itemId)
            .map((line) => (
              <CardRow
                key={line.key}
                title={line.itemName}
                subtitle={`${line.quantity} ${line.unit} × ${formatInr(line.rate)}`}
                badge={`GST ${line.gstRate}%`}
              />
            ))}
          {totals ? (
            <>
              <CardRow
                title="Taxable amount"
                amount={formatInr(totals.taxableAmount)}
              />
              <CardRow
                title="GST"
                amount={formatInr(totals.totalGstAmount)}
              />
              <CardRow
                title="Grand total"
                amount={formatInr(totals.grandTotal)}
              />
            </>
          ) : null}
        </View>
      ) : null}

      <PickerModal
        visible={customerPickerOpen}
        title="Select customer"
        options={customers.map((party) => ({
          key: party.id,
          label: party.name,
        }))}
        onSelect={(customerId) =>
          setForm((current) => ({ ...current, customerId }))
        }
        onClose={() => setCustomerPickerOpen(false)}
      />
    </Screen>
  )
}
