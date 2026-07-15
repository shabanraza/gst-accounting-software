import { Pressable, Text, View } from '@/tw'
import { useState } from 'react'

import { useWorkspace } from '@/lib/workspace'

export function CompanySwitcher() {
  const { companyName, companies, setActiveCompany } = useWorkspace()
  const [open, setOpen] = useState(false)

  return (
    <View>
      <Pressable
        className="rounded-lg border border-gray-200 bg-white px-3 py-2"
        onPress={() => setOpen((value) => !value)}
      >
        <Text className="text-sm text-gray-500">Company</Text>
        <Text className="font-semibold text-gray-900">
          {companyName ?? 'Select company'}
        </Text>
      </Pressable>
      {open ? (
        <View className="mt-2 gap-2 rounded-lg border border-gray-200 bg-white p-2">
          {companies.map((company) => (
            <Pressable
              key={company.id}
              className="rounded-md px-3 py-2"
              onPress={() => {
                void setActiveCompany(company.id)
                setOpen(false)
              }}
            >
              <Text className="text-gray-900">{company.tradeName}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  )
}
