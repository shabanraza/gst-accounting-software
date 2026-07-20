import { createFileRoute, Link } from '@tanstack/react-router'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

export const Route = createFileRoute('/data-deletion')({
  component: DataDeletionRoute,
})

function DataDeletionRoute() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">HisaabKro</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Data Deletion
          </h1>
          <p className="text-sm text-muted-foreground">
            Request deletion of your HisaabKro account and associated business
            data.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How To Request Deletion</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Send a request from your registered email address to{' '}
              <a
                className="font-medium text-foreground underline-offset-4 hover:underline"
                href="mailto:privacy@hisaabkro.in?subject=HisaabKro%20account%20deletion%20request"
              >
                privacy@hisaabkro.in
              </a>
              . Include your account email and company name so we can verify the
              workspace.
            </p>
            <p>
              You can also open this page from the HisaabKro mobile app under
              Settings.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What Will Be Deleted</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              We will delete or anonymize your user account, login sessions,
              company workspace data, ledgers, invoices, purchase records,
              attachments, and related operational records where deletion is
              legally and technically possible.
            </p>
            <p>
              Some records may be retained where required for tax, legal,
              security, fraud-prevention, backup, or dispute-resolution
              obligations. Backup copies are removed according to the backup
              retention cycle.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            For support, email{' '}
            <a
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href="mailto:support@hisaabkro.in"
            >
              support@hisaabkro.in
            </a>{' '}
            or read the{' '}
            <Link
              className="font-medium text-foreground underline-offset-4 hover:underline"
              to="/privacy"
            >
              Privacy Policy
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
