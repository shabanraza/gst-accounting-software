import { CircleCheckIcon } from 'lucide-react'

import { TRUST_POINTS } from '#/features/marketing/landing-content.ts'

/** What the product guarantees, stated plainly in place of logo walls. */
export function TrustStrip() {
  return (
    <section
      aria-label="What HisaabKro guarantees"
      className="border-y border-border/70 bg-muted/30"
    >
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 text-sm text-muted-foreground">
        {TRUST_POINTS.map((point) => (
          <li className="flex items-center gap-2" key={point}>
            <CircleCheckIcon className="size-4 text-primary" />
            {point}
          </li>
        ))}
      </ul>
    </section>
  )
}
