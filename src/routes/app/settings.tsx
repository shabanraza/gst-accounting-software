import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { DownloadIcon, ExternalLinkIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { AuditLogViewer } from '#/features/audit/components/audit-log-viewer.tsx'
import { CompanyProfilePanel } from '#/features/companies/components/company-profile-panel.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { TeamMembersPanel } from '#/features/team/components/team-members-panel.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'

export const Route = createFileRoute('/app/settings')({
  component: SettingsRoute,
})

function SettingsRoute() {
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()

  const exportQuery = useQuery({
    ...trpc.reports.accountantExport.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: false,
  })

  async function downloadBackup() {
    if (!companyId) return
    const data = await exportQuery.refetch()
    if (!data.data) return
    const blob = new Blob([JSON.stringify(data.data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `company-backup-${companyId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <WorkspacePage
      description="Company preferences, invoice series, roles, and audit controls."
      title="Settings"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice series</CardTitle>
            <CardDescription>
              Safe sequences by voucher type and financial year are ready in the
              domain layer.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Sales/purchase vouchers allocate numbers on save (series + padded
            sequence). Attachments store company-scoped metadata; R2 binary
            storage comes next.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backup export</CardTitle>
            <CardDescription>
              Download trial balance, sales, and purchases as JSON (Phase 7
              stub).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              disabled={!companyId || !isReady || exportQuery.isFetching}
              onClick={() => void downloadBackup()}
              type="button"
              variant="outline"
            >
              <DownloadIcon data-icon="inline-start" />
              Download company backup
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document storage</CardTitle>
            <CardDescription>
              Bill attachments use an object-storage adapter (R2 next).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Metadata is company-scoped; files stay outside the database.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Privacy and data</CardTitle>
            <CardDescription>
              Public policy and account deletion request links for store
              compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline">
              <Link to="/privacy">
                Privacy policy
                <ExternalLinkIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild type="button" variant="outline">
              <Link to="/data-deletion">
                Data deletion
                <ExternalLinkIcon data-icon="inline-end" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <CompanyProfilePanel />
      <TeamMembersPanel />
      <AuditLogViewer />
    </WorkspacePage>
  )
}
