import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, CircleCheckIcon, CircleIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Progress } from '#/components/ui/progress.tsx'
import { cn } from '#/lib/utils.ts'

import type { SetupStep } from '#/features/dashboard/setup-checklist.ts'

/** A new company's first steps, each ticked off from real records. */
export function SetupChecklistCard({
  doneCount,
  steps,
}: {
  doneCount: number
  steps: Array<SetupStep>
}) {
  const next = steps.find((step) => !step.done)

  return (
    <Card size="hero">
      <CardHeader>
        <CardTitle className="text-base">Get your books ready</CardTitle>
        <CardDescription>
          {doneCount} of {steps.length} done
        </CardDescription>
        <Progress
          aria-label="Setup progress"
          className="mt-2"
          value={(doneCount / steps.length) * 100}
        />
      </CardHeader>
      <CardContent className="flex flex-col px-0">
        {steps.map((step) => {
          const isNext = step.key === next?.key
          return (
            <div
              className="flex items-center gap-3 border-t border-border/60 px-(--card-spacing) py-3"
              key={step.key}
            >
              {step.done ? (
                <CircleCheckIcon
                  aria-label="Done"
                  className="size-5 shrink-0 text-money-in"
                />
              ) : (
                <CircleIcon
                  aria-label="To do"
                  className="size-5 shrink-0 text-muted-foreground"
                />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={cn(
                    'truncate text-sm font-medium',
                    step.done && 'text-muted-foreground line-through',
                  )}
                >
                  {step.title}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {step.detail}
                </span>
              </span>
              {!step.done ? (
                <Button
                  asChild
                  size="sm"
                  variant={isNext ? 'default' : 'outline'}
                >
                  <Link to={step.to}>
                    {isNext ? 'Start' : 'Open'}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Link>
                </Button>
              ) : null}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
