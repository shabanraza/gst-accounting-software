import { CheckIcon } from 'lucide-react'

import { AppScreenshot } from '#/features/marketing/components/app-screenshot.tsx'
import { SHOWCASE } from '#/features/marketing/landing-content.ts'
import { cn } from '#/lib/utils.ts'

/** One section per job, text beside the real screen, alternating sides. */
export function FeatureShowcase() {
  return (
    <section
      className="mx-auto flex max-w-6xl scroll-mt-20 flex-col gap-16 px-4 py-16 md:gap-24 md:py-24"
      id={SHOWCASE.id}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center">
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {SHOWCASE.title}
        </h2>
        <p className="text-base text-muted-foreground md:text-lg">
          {SHOWCASE.subtitle}
        </p>
      </div>

      {SHOWCASE.items.map((item, index) => (
        <article
          className={cn(
            'grid items-center gap-8 lg:gap-12',
            index % 2 === 0
              ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
              : 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]',
          )}
          id={item.id}
          key={item.id}
        >
          <div
            className={cn(
              'flex flex-col gap-4',
              index % 2 === 1 && 'lg:order-2',
            )}
          >
            <span className="text-sm font-medium text-primary">
              {item.eyebrow}
            </span>
            <h3 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
              {item.title}
            </h3>
            <p className="text-muted-foreground">{item.body}</p>
            <ul className="flex flex-col gap-2 text-sm">
              {item.points.map((point) => (
                <li className="flex items-start gap-2" key={point}>
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <AppScreenshot
            className={cn(index % 2 === 1 && 'lg:order-1')}
            shot={item.screenshot}
            sizes="(min-width: 1024px) 640px, 100vw"
          />
        </article>
      ))}
    </section>
  )
}
