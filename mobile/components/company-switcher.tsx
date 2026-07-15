import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'
import { useState } from 'react'

import { useWorkspace } from '@/lib/workspace'

const PRIMARY_COLOR = '#2563eb'

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
          onPress={() => setOpen((value) => !value)}
        >
          <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
            {companyName ?? 'Select company'}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={PRIMARY_COLOR}
          />
        </Pressable>
        {open ? (
          <View className="absolute top-8 z-10 w-64 gap-0.5 rounded-xl border border-border bg-card p-1.5 shadow-sm">
            {companies.map((company) => (
              <Pressable
                key={company.id}
                className="rounded-lg px-3 py-2 active:bg-muted"
                onPress={() => {
                  void setActiveCompany(company.id)
                  setOpen(false)
                }}
              >
                <Text className="font-medium text-foreground">{company.tradeName}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <View>
      <Pressable
        className="flex-row items-center justify-between rounded-2xl border border-border bg-card px-4 py-3"
        onPress={() => setOpen((value) => !value)}
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
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={PRIMARY_COLOR}
        />
      </Pressable>
      {open ? (
        <View className="mt-2 gap-1 rounded-2xl border border-border bg-card p-2">
          {companies.map((company) => (
            <Pressable
              key={company.id}
              className="rounded-xl px-3 py-2.5 active:bg-muted"
              onPress={() => {
                void setActiveCompany(company.id)
                setOpen(false)
              }}
            >
              <Text className="font-medium text-foreground">{company.tradeName}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}
