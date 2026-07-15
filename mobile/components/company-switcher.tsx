import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'
import { useState } from 'react'

import { BottomSheet } from '@/components/ui/dialog'
import { CardRow } from '@/components/data/card-row'
import { layout } from '@/lib/spacing'
import { themeColors } from '@/lib/theme'
import { useWorkspace } from '@/lib/workspace'

export function CompanySwitcher({
  variant = 'card',
}: {
  variant?: 'card' | 'header'
}) {
  const { companyName, companies, setActiveCompany } = useWorkspace()
  const [open, setOpen] = useState(false)

  if (variant === 'header') {
    return (
      <View className="flex-1">
        <Pressable
          className="flex-row items-center gap-1 self-start"
          onPress={() => setOpen(true)}
        >
          <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
            {companyName ?? 'Select company'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={themeColors.primary} />
        </Pressable>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title="Switch company"
        >
          <View style={{ gap: layout.sectionHeaderGap }}>
            {companies.map((company) => (
              <CardRow
                key={company.id}
                title={company.tradeName}
                onPress={() => {
                  void setActiveCompany(company.id)
                  setOpen(false)
                }}
              />
            ))}
          </View>
        </BottomSheet>
      </View>
    )
  }

  return (
    <View>
      <Pressable
        className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
        onPress={() => setOpen(true)}
      >
        <View className="flex-1 gap-0.5">
          <Text className="text-xs font-medium uppercase tracking-wide text-primary">
            Company
          </Text>
          <Text className="text-base font-semibold text-foreground">
            {companyName ?? 'Select company'}
          </Text>
        </View>
        <Ionicons
          name="chevron-down"
          size={18}
          color={themeColors.primary}
        />
      </Pressable>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Switch company"
      >
        <View style={{ gap: layout.sectionHeaderGap }}>
          {companies.map((company) => (
            <CardRow
              key={company.id}
              title={company.tradeName}
              onPress={() => {
                void setActiveCompany(company.id)
                setOpen(false)
              }}
            />
          ))}
        </View>
      </BottomSheet>
    </View>
  )
}
