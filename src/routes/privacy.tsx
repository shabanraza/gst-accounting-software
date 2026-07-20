import { createFileRoute, Link } from '@tanstack/react-router'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

const updatedAt = 'July 18, 2026'

export const Route = createFileRoute('/privacy')({
  component: PrivacyRoute,
})

function PrivacyRoute() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">HisaabKro</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {updatedAt}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">What We Collect</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              HisaabKro collects account details such as name, email address,
              login session data, and business workspace information needed to
              run GST billing, khata, inventory, purchases, and reports.
            </p>
            <p>
              Users may add company details, GSTIN, party ledgers, invoices,
              purchase bills, stock records, payments, attachments, and OCR
              review data. Camera or photo access is requested only when a user
              chooses to capture or attach bill images.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How We Use Data</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Data is used to provide accounting workflows, authenticate users,
              keep company records, generate invoices and reports, process bill
              attachments, and maintain security and reliability.
            </p>
            <p>
              HisaabKro does not sell user data. Data may be processed by
              service providers used for hosting, database, authentication,
              email delivery, storage, analytics, or OCR where required to run
              the service.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retention And Deletion</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              Business records are retained while the account or workspace is
              active, or as needed for legal, tax, security, backup, and dispute
              handling requirements.
            </p>
            <p>
              To request account and data deletion, visit{' '}
              <Link
                className="font-medium text-foreground underline-offset-4 hover:underline"
                to="/data-deletion"
              >
                Data Deletion
              </Link>{' '}
              or email{' '}
              <a
                className="font-medium text-foreground underline-offset-4 hover:underline"
                href="mailto:privacy@hisaabkro.in"
              >
                privacy@hisaabkro.in
              </a>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            For privacy questions, contact{' '}
            <a
              className="font-medium text-foreground underline-offset-4 hover:underline"
              href="mailto:privacy@hisaabkro.in"
            >
              privacy@hisaabkro.in
            </a>
            .
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
