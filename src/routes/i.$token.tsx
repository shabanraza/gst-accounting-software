import { createFileRoute } from '@tanstack/react-router'

import { PublicInvoiceView } from '#/features/sales/components/public-invoice-view.tsx'

// Customer-facing invoice link. Deliberately absent from sitemap.xml.
export const Route = createFileRoute('/i/$token')({
  head: () => ({
    meta: [
      { title: 'Invoice' },
      { name: 'robots', content: 'noindex, nofollow' },
      // The token is a bearer credential; never send it in a Referer header.
      { name: 'referrer', content: 'no-referrer' },
    ],
  }),
  component: PublicInvoiceRoute,
})

function PublicInvoiceRoute() {
  const { token } = Route.useParams()
  return <PublicInvoiceView token={token} />
}
