import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'

export function PlaceholderPage({
  title,
  description,
  detail,
}: {
  title: string
  description: string
  detail?: string
}) {
  return (
    <WorkspacePage description={description} title={title}>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            {detail ??
              'This workspace screen is scaffolded and ready for product work.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Navigation and shell layout are live; domain workflows will land
            next.
          </p>
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
