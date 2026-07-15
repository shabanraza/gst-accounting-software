import { Ionicons } from '@expo/vector-icons'
import { Pressable, Text, View } from '@/tw'
import { useState } from 'react'

import { useWorkspace } from '@/lib/workspace'

export function CompanySwitcher() {
  const { companyName, companies, setActiveCompany } = useWorkspace()
  const [open, setOpen] = useState(false)

  return (
    <View>
      <Pressable
        className="flex-row items-center justify-between rounded-2xl border border-blue-100 bg-white px-4 py-3"
        onPress={() => setOpen((value) => !value)}
      >
        <View className="flex-1 gap-0.5">
          <Text className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Company
          </Text>
          <Text className="text-base font-semibold text-gray-900">
            {companyName ?? 'Select company'}
          </Text>
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#2563eb"
        />
      </Pressable>
      {open ? (
        <View className="mt-2 gap-1 rounded-2xl border border-blue-100 bg-white p-2">
          {companies.map((company) => (
            <Pressable
              key={company.id}
              className="rounded-xl px-3 py-2.5 active:bg-blue-50"
              onPress={() => {
                void setActiveCompany(company.id)
                setOpen(false)
              }}
            >
              <Text className="font-medium text-gray-900">{company.tradeName}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}
