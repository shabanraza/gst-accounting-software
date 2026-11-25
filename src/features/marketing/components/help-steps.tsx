import { parseStep } from '#/features/marketing/help-content.ts'

/** A guide's numbered steps, with app labels in medium weight. */
export function HelpSteps({
  steps,
  size = 'sm',
}: {
  steps: ReadonlyArray<string>
  size?: 'sm' | 'base'
}) {
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => (
        <li key={step} className="flex gap-3">
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs text-muted-foreground tabular-nums"
          >
            {index + 1}
          </span>
          <p
            className={
              size === 'base'
                ? 'pt-0.5 text-base leading-relaxed text-pretty text-muted-foreground'
                : 'pt-0.5 text-sm leading-relaxed text-pretty text-muted-foreground'
            }
          >
            {parseStep(step).map((segment, segmentIndex) =>
              segment.label ? (
                <span key={segmentIndex} className="font-medium text-foreground">
                  {segment.text}
                </span>
              ) : (
                <span key={segmentIndex}>{segment.text}</span>
              ),
            )}
          </p>
        </li>
      ))}
    </ol>
  )
}
