import { CodeIcon, DownloadIcon, HistoryIcon, ScaleIcon } from 'lucide-react'

import { SECURITY } from '#/features/marketing/landing-content.ts'

const ICONS = [ScaleIcon, HistoryIcon, DownloadIcon, CodeIcon] as const

export function SecuritySection() {
  return (
    <section
      className="scroll-mt-20 border-y border-border/70 bg-muted/30"
      id={SECURITY.id}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-16 md:py-24">
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            {SECURITY.title}
          </h2>
          <p className="text-base text-muted-foreground md:text-lg">
            {SECURITY.subtitle}
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SECURITY.items.map((item, index) => {
            const Icon = ICONS[index]
            return (
              <div className="flex flex-col gap-3" key={item.title}>
                <Icon className="size-6 text-primary" />
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.body}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
