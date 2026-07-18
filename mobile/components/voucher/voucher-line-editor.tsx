import * as React from 'react'

import { LineCard } from '@/components/layout/line-card'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { formatInr } from '@/lib/format-inr'
import { Text, View } from '@/tw'

export type VoucherLineEditorLine = {
  key: string
  itemId: string
  itemName: string
  hsnCode: string
  gstRate: string
  unit: string
  quantity: string
  rate: string
  discountPercent: string
  godownName: string
}

export type VoucherLineEditorItem = {
  id: string
  name: string
  hsnCode: string
  gstRate: string
  baseUnit: string
  rate: string
}

export function VoucherLineEditor({
  line,
  index,
  godownNames,
  items,
  onChange,
  onRemove,
  canRemove,
  applyItem,
}: {
  line: VoucherLineEditorLine
  index: number
  godownNames: Array<string>
  items: Array<VoucherLineEditorItem>
  onChange: (line: VoucherLineEditorLine) => void
  onRemove: () => void
  canRemove: boolean
  applyItem: (
    line: VoucherLineEditorLine,
    item: VoucherLineEditorItem,
  ) => VoucherLineEditorLine
}) {
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false)
  const [godownPickerOpen, setGodownPickerOpen] = React.useState(false)

  const lineAmount =
    Number(line.quantity) > 0 && Number(line.rate) >= 0
      ? Number(line.quantity) * Number(line.rate)
      : null

  return (
    <LineCard
      canRemove={canRemove}
      onRemove={onRemove}
      title={`Line ${index + 1}`}
      trailing={
        lineAmount !== null ? (
          <Text className="font-semibold text-foreground">
            {formatInr(String(lineAmount))}
          </Text>
        ) : undefined
      }
    >
      <PickerField
        label="Item"
        value={line.itemName}
        placeholder="Select item"
        onPress={() => setItemPickerOpen(true)}
      />
      {line.itemId ? (
        <Text className="text-sm text-muted-foreground">
          HSN {line.hsnCode || '—'} · GST {line.gstRate}% · {line.unit || '—'}
        </Text>
      ) : null}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormFieldGroup label="Quantity">
            <FormField
              keyboardType="decimal-pad"
              placeholder="1"
              value={line.quantity}
              onChangeText={(quantity) => onChange({ ...line, quantity })}
            />
          </FormFieldGroup>
        </View>
        <View className="flex-1">
          <FormFieldGroup label="Rate">
            <FormField
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={line.rate}
              onChangeText={(rate) => onChange({ ...line, rate })}
            />
          </FormFieldGroup>
        </View>
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <FormFieldGroup label="Discount %">
            <FormField
              keyboardType="decimal-pad"
              placeholder="0"
              value={line.discountPercent}
              onChangeText={(discountPercent) =>
                onChange({ ...line, discountPercent })
              }
            />
          </FormFieldGroup>
        </View>
        <View className="flex-1">
          <PickerField
            label="Godown"
            value={line.godownName}
            placeholder="Select godown"
            onPress={() => setGodownPickerOpen(true)}
          />
        </View>
      </View>
      <PickerModal
        visible={itemPickerOpen}
        title="Select item"
        searchable
        searchPlaceholder="Search name / HSN"
        options={items.map((item) => ({
          key: item.id,
          label: item.name,
          description: `HSN ${item.hsnCode} · ${item.gstRate}% · ${item.baseUnit}`,
          keywords: item.hsnCode,
        }))}
        onSelect={(itemId) => {
          const item = items.find((entry) => entry.id === itemId)
          if (!item) return
          onChange(applyItem(line, item))
        }}
        onClose={() => setItemPickerOpen(false)}
      />
      <PickerModal
        visible={godownPickerOpen}
        title="Select godown"
        options={godownNames.map((name) => ({ key: name, label: name }))}
        onSelect={(godownName) => onChange({ ...line, godownName })}
        onClose={() => setGodownPickerOpen(false)}
      />
    </LineCard>
  )
}
