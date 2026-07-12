import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

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
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-1 py-4">
        <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
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
    </div>
  )
}
