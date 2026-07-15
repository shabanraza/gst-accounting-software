import { Link } from 'expo-router'

import { ModuleLinkCard, Screen } from '@/components/screen'
import { CompanySwitcher } from '@/components/company-switcher'
import { Pressable, Text } from '@/tw'
import { getModulesForTab } from '@/lib/nav-config'
import { authClient } from '@/lib/auth-client'
import { clearWorkspaceStorage } from '@/lib/workspace'

export default function MoreScreen() {
  const modules = getModulesForTab('more')

  async function handleSignOut() {
    await clearWorkspaceStorage()
    await authClient.signOut()
  }

  return (
    <Screen title="More" subtitle="Banking, masters, reports">
      <CompanySwitcher />
      {modules.map((module) => (
        <ModuleLinkCard key={module.id} module={module} />
      ))}
      <Pressable
        className="rounded-xl border border-gray-100 bg-white p-4"
        onPress={() => void handleSignOut()}
      >
        <Text className="font-semibold text-red-600">Sign out</Text>
      </Pressable>
    </Screen>
  )
}
