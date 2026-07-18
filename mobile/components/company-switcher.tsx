import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'
import { useState } from 'react'
import { StyleSheet } from 'react-native'

import { BottomSheet } from '@/components/ui/dialog'
import { CardRow } from '@/components/data/card-row'
import { pageLayout, spacing } from '@/lib/spacing'
import { themeColors } from '@/lib/theme'
import { useWorkspace } from '@/lib/workspace'

export function CompanySwitcher({
  variant = 'card',
}: {
  variant?: 'card' | 'header'
}) {
  const { company, companyName, companies, setActiveCompany } = useWorkspace()
  const [open, setOpen] = useState(false)
  const gstinLabel = company?.gstin ? `GSTIN ${company.gstin}` : 'GSTIN not set'

  if (variant === 'header') {
    return (
      <View className="flex-1">
        <Pressable
          className="self-start"
          style={styles.headerPill}
          onPress={() => setOpen(true)}
        >
          <View className="min-w-0" style={styles.headerText}>
            <View className="flex-row items-center gap-1">
              <Text className="text-base font-bold text-foreground" numberOfLines={1}>
                {companyName ?? 'Select company'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={themeColors.secondary} />
            </View>
            <Text className="text-xs font-medium text-muted-foreground" numberOfLines={1}>
              {gstinLabel}
            </Text>
          </View>
        </Pressable>
        <BottomSheet
          open={open}
          onOpenChange={setOpen}
          title="Switch company"
        >
          <View style={{ gap: pageLayout.sectionHeaderGap }}>
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
        <View style={{ gap: pageLayout.sectionHeaderGap }}>
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

const styles = StyleSheet.create({
  headerPill: {
    maxWidth: 220,
    minHeight: 42,
    paddingVertical: spacing.xs,
  },
  headerText: {
    maxWidth: 190,
  },
})
