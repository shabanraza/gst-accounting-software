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
  DEFAULT_PURCHASE_SERIES,
  applyItemToPurchaseLine,
  buildPostPurchaseBillInput,
  computePurchaseFormTotals,
  createEmptyPurchaseLine,
  createInitialPurchaseBillForm,
  filterSupplierParties,
  validatePurchaseBillForm,
  validatePurchaseLedgerMappings,
  validateActiveFinancialYearId,
  type PurchaseBillFormDraft,
  type PurchaseBillLineDraft,
  type PurchaseItemLike,
  type PurchasePartyLike,
} from '@/lib/purchase-bill-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

type WizardStep = 'supplier' | 'lines' | 'review'

function StepPills({ step }: { step: WizardStep }) {
  const steps: Array<{ id: WizardStep; label: string }> = [
    { id: 'supplier', label: 'Supplier' },
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
  line: PurchaseBillLineDraft
  index: number
  godownName: string
  items: Array<PurchaseItemLike>
  onChange: (line: PurchaseBillLineDraft) => void
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
          onChange(applyItemToPurchaseLine(line, item, godownName))
        }
        onClose={() => setPickerOpen(false)}
      />
    </View>
  )
}

function mapItems(
  items: Array<{
    id: string
    name: string
    gstRate: string
    baseUnit: string
    purchaseRate: string
  }>,
): Array<PurchaseItemLike> {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    gstRate: item.gstRate,
    baseUnit: item.baseUnit,
    purchaseRate: item.purchaseRate,
  }))
}

export function PurchaseBillCreateScreen() {
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
  const [step, setStep] = React.useState<WizardStep>('supplier')
  const [form, setForm] = React.useState<PurchaseBillFormDraft>(() =>
    createInitialPurchaseBillForm(defaultGodown),
  )
  const [supplierPickerOpen, setSupplierPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (defaultGodown && form.godownName !== defaultGodown && !godowns.length) {
      return
    }
    if (defaultGodown && form.godownName === 'Main' && defaultGodown !== 'Main') {
      setForm(createInitialPurchaseBillForm(defaultGodown))
    }
  }, [defaultGodown, form.godownName, godowns.length])

  const suppliers = filterSupplierParties(partiesQuery.data ?? [])
  const items = mapItems(itemsQuery.data ?? [])
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

      const supplierBillNumber = await trpcClient.documents.nextNumber.mutate({
        companyId: company.id,
        financialYearId: activeFinancialYearId,
        voucherType: 'purchase',
        series: DEFAULT_PURCHASE_SERIES,
        padLength: 4,
      })

      const payload = buildPostPurchaseBillInput(form, {
        company,
        ledgerBySystemKey,
        supplier: selectedSupplier,
        supplierBillNumber,
      })

      return trpcClient.purchases.postBill.mutate(payload)
    },
    onSuccess: async (bill) => {
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'purchases'],
      })
      router.replace(`/(app)/purchases/${bill.id}` as never)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to post bill.',
      )
    },
  })

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

  function goNext() {
    setError(null)
    if (step === 'supplier') {
      if (!form.supplierId) {
        setError('Select a supplier.')
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

  return (
    <Screen title="New purchase bill" subtitle="Create purchase bill">
      <StepPills step={step} />

      {!isReady || mastersLoading ? <LoadingState /> : null}
      {mastersError ? (
        <EmptyState message="Unable to load suppliers or items." />
      ) : null}

      {step === 'supplier' ? (
        <View className="gap-section-header">
          <SectionHeader title="Supplier" compact icon="business-outline" />
          <Pressable
            className="rounded-xl border border-border bg-card px-4 py-3"
            onPress={() => setSupplierPickerOpen(true)}
          >
            <Text className="text-sm text-muted-foreground">Supplier</Text>
            <Text className="font-medium text-foreground">
              {selectedSupplier?.name ?? 'Select supplier'}
            </Text>
          </Pressable>
          <View>
            <Text className="mb-1 text-sm text-muted-foreground">Bill date</Text>
            <FormField
              placeholder="YYYY-MM-DD"
              value={form.billDate}
              onChangeText={(billDate) =>
                setForm((current) => ({ ...current, billDate }))
              }
            />
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
            title={selectedSupplier?.name ?? 'Supplier'}
            subtitle={form.billDate}
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
            label={postMutation.isPending ? 'Posting…' : 'Post bill'}
            loading={postMutation.isPending}
            disabled={postMutation.isPending}
            onPress={() => postMutation.mutate()}
          />
        </View>
      ) : null}

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      {step !== 'review' ? (
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
            <PrimaryButton label="Continue" onPress={goNext} />
          </View>
        </View>
      ) : (
        <SecondaryButton label="Back to items" onPress={() => setStep('lines')} />
      )}

      <PickerModal
        visible={supplierPickerOpen}
        title="Select supplier"
        items={suppliers}
        renderLabel={(party) => party.name}
        onSelect={(party: PurchasePartyLike) =>
          setForm((current) => ({ ...current, supplierId: party.id }))
        }
        onClose={() => setSupplierPickerOpen(false)}
      />
    </Screen>
  )
}
