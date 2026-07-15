import { ActionGrid } from '@/components/dashboard/action-grid'
import type { ActionGridItem } from '@/components/dashboard/action-grid'
import { ModuleLinkCard } from '@/components/data/module-link-card'
import { Screen } from '@/components/layout/screen'
import { SectionHeader } from '@/components/layout/section-header'
import { CompanySwitcher } from '@/components/company-switcher'
import { Pressable, Text, View } from '@/tw'
import { getModulesForTab } from '@/lib/nav-config'
import { authClient } from '@/lib/auth-client'
import { clearWorkspaceStorage } from '@/lib/workspace'
import { pageLayout } from '@/lib/spacing'

const MORE_QUICK_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'parties',
    label: 'Parties',
    icon: 'people-outline',
    href: '/(app)/module/parties',
    accent: 'blue',
  },
  {
    id: 'reports',
    label: 'GST\nReports',
    icon: 'bar-chart-outline',
    href: '/(app)/module/reports',
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: 'card-outline',
    href: '/(app)/module/bank-reconciliation',
    accent: 'orange',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings-outline',
    href: '/(app)/module/settings',
  },
]

export default function MoreScreen() {
  const modules = getModulesForTab('more')

  async function handleSignOut() {
    await clearWorkspaceStorage()
    await authClient.signOut()
  }

  return (
    <Screen title="More" subtitle="Banking, masters, reports" variant="tab">
      <CompanySwitcher />
      <View style={{ gap: pageLayout.sectionHeaderGap }}>
        <SectionHeader title="Quick links" compact icon="flash-outline" />
        <ActionGrid items={MORE_QUICK_ACTIONS} />
      </View>
      <View style={{ gap: pageLayout.sectionHeaderGap }}>
        <SectionHeader title="All modules" compact icon="grid-outline" />
        <View style={{ gap: pageLayout.sectionHeaderGap }}>
          {modules.map((module) => (
            <ModuleLinkCard key={module.id} module={module} />
          ))}
        </View>
      </View>
      <Pressable
        className="flex-row items-center gap-3 rounded-xl border border-border bg-card"
        style={{ padding: pageLayout.cardPadding }}
        onPress={() => void handleSignOut()}
      >
        <Text className="flex-1 font-semibold text-icon-accent-red">Sign out</Text>
      </Pressable>
    </Screen>
  )
}
