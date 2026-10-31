import * as React from 'react'
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  SquarePenIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '#/components/ui/avatar.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
} from '#/components/ui/input-group.tsx'
import { Kbd } from '#/components/ui/kbd.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { AppFrame } from '#/features/marketing/components/app-screenshot.tsx'
import { ASK_AI_DEMO } from '#/features/marketing/landing-content.ts'
import { cn } from '#/lib/utils.ts'

type Phase = 'typing' | 'working' | 'answer'

export type AskAiDemoState = {
  scenario: number
  phase: Phase
  /** Characters of the question typed so far. */
  typed: number
  step: number
  /** Answer parts shown so far: the figures, then the report link. */
  shown: number
}

const TYPE_MS = 45
const SEND_PAUSE_MS = 400
const STEP_MS = 900
const REVEAL_MS = 200
const HOLD_MS = 4000

const entering =
  'animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-(--duration-base) ease-(--ease-precise)'

const partCount = (scenario: number) =>
  ASK_AI_DEMO.scenarios[scenario].figures.length + 1

export const askAiDemoStart = (scenario = 0): AskAiDemoState => ({
  scenario,
  phase: 'typing',
  typed: 0,
  step: 0,
  shown: 0,
})

/** The finished first answer: shown before playback, without JS, and for reduced motion. */
export const askAiDemoFinal: AskAiDemoState = {
  scenario: 0,
  phase: 'answer',
  typed: ASK_AI_DEMO.scenarios[0].question.length,
  step: ASK_AI_DEMO.workingSteps.length - 1,
  shown: partCount(0),
}

/** The next frame of the replay and how long to wait before showing it. */
export function nextAskAiDemoState(state: AskAiDemoState): {
  delay: number
  state: AskAiDemoState
} {
  const { question } = ASK_AI_DEMO.scenarios[state.scenario]
  if (state.phase === 'typing') {
    return state.typed < question.length
      ? { delay: TYPE_MS, state: { ...state, typed: state.typed + 1 } }
      : { delay: SEND_PAUSE_MS, state: { ...state, phase: 'working' } }
  }
  if (state.phase === 'working') {
    return state.step < ASK_AI_DEMO.workingSteps.length - 1
      ? { delay: STEP_MS, state: { ...state, step: state.step + 1 } }
      : { delay: STEP_MS, state: { ...state, phase: 'answer', shown: 0 } }
  }
  return state.shown < partCount(state.scenario)
    ? { delay: REVEAL_MS, state: { ...state, shown: state.shown + 1 } }
    : {
        delay: HOLD_MS,
        state: askAiDemoStart(
          (state.scenario + 1) % ASK_AI_DEMO.scenarios.length,
        ),
      }
}

/**
 * The Ask AI chat replaying sample questions: the question types into the
 * composer, the working state shows, then the answer and its figures appear.
 * Plays only while on screen.
 */
export function AskAiDemo({ className }: { className?: string }) {
  const ref = React.useRef<HTMLElement>(null)
  const [state, setState] = React.useState(askAiDemoFinal)
  const [playing, setPlaying] = React.useState(false)
  const started = React.useRef(false)

  React.useEffect(() => {
    const node = ref.current
    // Without these (reduced motion, old browsers) the finished answer stays.
    if (
      !node ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          setState(askAiDemoStart())
        }
        setPlaying(entry.isIntersecting)
      },
      { threshold: 0.4 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (!playing) return
    const next = nextAskAiDemoState(state)
    const timer = window.setTimeout(() => setState(next.state), next.delay)
    return () => window.clearTimeout(timer)
  }, [playing, state])

  const scenario = ASK_AI_DEMO.scenarios[state.scenario]
  const asked = state.phase !== 'typing'
  const draft = asked ? '' : scenario.question.slice(0, state.typed)

  return (
    <AppFrame
      aria-label={ASK_AI_DEMO.label}
      className={className}
      path="/app/assistant"
      ref={ref}
      role="img"
    >
      <div aria-hidden="true" className="flex flex-col bg-background">
        <div
          className="flex h-11 items-center justify-between gap-2 px-3 sm:px-4"
          data-ui="chrome"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <SparklesIcon className="size-4 text-muted-foreground" />
            Ask AI
          </span>
          <Button asChild size="sm" variant="ghost">
            <span>
              <SquarePenIcon data-icon="inline-start" />
              New chat
            </span>
          </Button>
        </div>

        <div
          className="flex h-80 flex-col justify-end gap-4 overflow-hidden px-3 py-4 sm:px-4"
          key={state.scenario}
        >
          {asked ? (
            <div
              className={cn(
                'max-w-[85%] self-end rounded-2xl bg-muted px-3.5 py-2 text-sm',
                entering,
              )}
            >
              {scenario.question}
            </div>
          ) : null}

          {state.phase === 'working' ? (
            <div className={cn('flex items-center gap-2.5', entering)}>
              <AssistantAvatar />
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="size-3.5" />
                {ASK_AI_DEMO.workingSteps[state.step]}
              </span>
            </div>
          ) : null}

          {state.phase === 'answer' ? (
            <div className={cn('flex gap-2.5', entering)}>
              <AssistantAvatar />
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5 text-sm">
                <p>{scenario.answer}</p>
                <dl
                  className="flex flex-col divide-y divide-border rounded-lg border border-border"
                  data-ui="data"
                >
                  {scenario.figures.slice(0, state.shown).map((figure) => (
                    <div
                      className={cn(
                        'flex items-baseline justify-between gap-3 px-3 py-1.5',
                        entering,
                      )}
                      key={figure.label}
                    >
                      <dt className="flex min-w-0 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                        <span className="truncate">{figure.label}</span>
                        {'note' in figure ? (
                          <span className="text-xs text-destructive">
                            {figure.note}
                          </span>
                        ) : null}
                      </dt>
                      <dd className="font-mono tabular-nums">
                        {figure.amount}
                      </dd>
                    </div>
                  ))}
                </dl>
                {state.shown > scenario.figures.length ? (
                  <Button
                    asChild
                    className={cn('self-start', entering)}
                    size="sm"
                    variant="outline"
                  >
                    <span>
                      {scenario.link}
                      <ArrowUpRightIcon data-icon="inline-end" />
                    </span>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <InputGroup className="rounded-2xl bg-background">
            <div className="flex min-h-12 w-full items-start px-3 pt-3 text-sm">
              {draft ? (
                <span>{draft}</span>
              ) : (
                <span className="text-muted-foreground">
                  Ask about your books…
                </span>
              )}
              {state.phase === 'typing' && playing ? (
                <span className="ml-px h-5 w-px animate-pulse bg-foreground" />
              ) : null}
            </div>
            <InputGroupAddon align="block-end">
              <InputGroupText className="hidden gap-1 sm:flex">
                <Kbd>Enter</Kbd> to send
              </InputGroupText>
              <Button
                asChild
                className="ml-auto size-7 rounded-full"
                size="icon-sm"
              >
                <span>
                  {state.phase === 'working' ? <Spinner /> : <ArrowUpIcon />}
                </span>
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
    </AppFrame>
  )
}

function AssistantAvatar() {
  return (
    <Avatar size="sm">
      <AvatarFallback>
        <SparklesIcon className="size-3" />
      </AvatarFallback>
    </Avatar>
  )
}
