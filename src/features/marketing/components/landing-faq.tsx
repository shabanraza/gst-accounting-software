import { ChevronDownIcon } from 'lucide-react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible.tsx'
import { FAQ } from '#/features/marketing/landing-content.ts'
import { cn } from '#/lib/utils.ts'

interface LandingFaqProps {
  id?: string
  title?: string
  items?: ReadonlyArray<{ question: string; answer: string }>
  /** `start` lines the FAQ up with the page column instead of centring it. */
  align?: 'center' | 'start'
}

export function LandingFaq({
  id = FAQ.id,
  title = FAQ.title,
  items = FAQ.items,
  align = 'center',
}: LandingFaqProps = {}) {
  return (
    <section
      className={cn(
        'mx-auto px-4 py-16 md:py-20',
        align === 'start' ? 'max-w-6xl' : 'max-w-3xl',
      )}
      data-ui="chrome"
      id={id}
    >
      <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
        {title}
      </h2>
      <div className="mt-8 flex max-w-3xl flex-col gap-2">
        {items.map((item) => (
          <Collapsible
            key={item.question}
            className="rounded-lg bg-card shadow-(--elevation-1)"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30 [&[data-state=open]>svg]:rotate-180">
              {item.question}
              <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-base) ease-(--ease-precise)" />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4 text-sm text-muted-foreground">
              {item.answer}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  )
}
