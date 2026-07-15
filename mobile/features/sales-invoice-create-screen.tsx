import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Modal, Pressable } from 'react-native'

import { SectionHeader } from '@/components/section-header'
import {
  CardRow,
  EmptyState,
  FormField,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/screen'
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
  type SalesPartyLike,
} from '@/lib/sales-invoice-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

type WizardStep = 'customer' | 'lines' | 'review'

function StepPills({ step }: { step: WizardStep }) {
  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: 'customer', label: 'Customer' },
    { id: 'lines', label: 'Items' },
    { id: 'review', label: 'Review' },
  ]

  return (
    <View className="flex-row gap-2">
      {steps.map((entry) => {
        const active = entry.id === step
        return (
          <View
            key={entry.id}
            className={`rounded-full px-3 py-1 ${active ? 'bg-primary' : 'bg-muted'}`}
          >
            <Text
              className={`text-caption font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {entry.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`rounded-full border px-4 py-2 ${active ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-medium ${active ? 'text-primary' : 'text-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function PickerModal<T extends { id: string }>({
  visible,
  title,
  items,
  renderLabel,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  items: Array<T>
  renderLabel: (item: T) => string
  onSelect: (item: T) => void
  onClose: () => void
}) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[70%] rounded-t-3xl bg-background p-page-x pb-page-bottom">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">{title}</Text>
            <Pressable onPress={onClose}>
              <Text className="text-sm font-medium text-primary">Close</Text>
            </Pressable>
          </View>
          <View className="gap-3">
            {items.map((item) => (
              <CardRow
                key={item.id}
                title={renderLabel(item)}
                onPress={() => {
                  onSelect(item)
                  onClose()
                }}
              />
            ))}
            {items.length === 0 ? (
              <EmptyState message="No options available." />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  )
}

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

  return (
    <View className="gap-3 rounded-xl border border-border bg-card p-card-padding">
      <View className="flex-row items-center justify-between">
        <Text className="font-semibold text-foreground">Line {index + 1}</Text>
        {canRemove ? (
          <Pressable onPress={onRemove}>
            <Text className="text-sm font-medium text-destructive">Remove</Text>
          </Pressable>
        ) : null}
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
        items={items}
        renderLabel={(item) => item.name}
        onSelect={(item) =>
          onChange(applyItemToLine(line, item, godownName))
        }
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

  return (
    <Screen title="New invoice" subtitle="Create sales invoice" keyboardAvoiding>
      <StepPills step={step} />

      {!isReady || mastersLoading ? <LoadingState /> : null}
      {mastersError ? (
        <EmptyState message="Unable to load customers or items." />
      ) : null}

      {step === 'customer' ? (
        <View className="gap-section-header">
          <SectionHeader title="Customer" compact icon="person-outline" />
          <Pressable
            className="rounded-xl border border-border bg-card px-4 py-3"
            onPress={() => setCustomerPickerOpen(true)}
          >
            <Text className="text-sm text-muted-foreground">Customer</Text>
            <Text className="font-medium text-foreground">
              {selectedCustomer?.name ?? 'Select customer'}
            </Text>
          </Pressable>
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
      ) : null}

      {step === 'lines' ? (
        <View className="gap-section-header">
          <SectionHeader title="Line items" compact icon="list-outline" />
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
          <SecondaryButton label="Add line" onPress={addLine} />
          {totals ? (
            <CardRow
              title="Estimated total"
              amount={formatInr(totals.grandTotal)}
              subtitle={`${totals.lineCount} line(s) · GST ${formatInr(totals.totalGstAmount)}`}
            />
          ) : null}
        </View>
      ) : null}

      {step === 'review' ? (
        <View className="gap-section-header">
          <SectionHeader title="Review" compact icon="checkmark-circle-outline" />
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
            <CardRow
              title="Grand total"
              amount={formatInr(totals.grandTotal)}
              subtitle={`Taxable ${formatInr(totals.taxableAmount)}`}
            />
          ) : null}
          <PrimaryButton
            label={postMutation.isPending ? 'Posting…' : 'Post invoice'}
            loading={postMutation.isPending}
            disabled={postMutation.isPending}
            onPress={() => postMutation.mutate()}
          />
        </View>
      ) : null}

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      {step !== 'review' ? (
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
            <PrimaryButton label="Continue" onPress={goNext} />
          </View>
        </View>
      ) : (
        <SecondaryButton label="Back to items" onPress={() => setStep('lines')} />
      )}

      <PickerModal
        visible={customerPickerOpen}
        title="Select customer"
        items={customers}
        renderLabel={(party) => party.name}
        onSelect={(party: SalesPartyLike) =>
          setForm((current) => ({ ...current, customerId: party.id }))
        }
        onClose={() => setCustomerPickerOpen(false)}
      />
    </Screen>
  )
}
