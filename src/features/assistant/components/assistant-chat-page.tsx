import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  Loader2Icon,
  SparklesIcon,
  SquarePenIcon,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { AssistantLink } from '#/features/assistant/assistant-tools.ts'

type Turn = {
  role: 'user' | 'assistant'
  content: string
  links?: Array<AssistantLink>
  failed?: boolean
}

const STARTERS = [
  'GST payable this month?',
  'Top items sold this month',
  'Who owes me the most?',
  'Cash aur bank mein kitna hai?',
]

const WORKING_STEPS = [
  'Reading your books…',
  'Checking the reports…',
  'Working out the figures…',
]

const storageKey = (companyId: string) => `hisaabkro:assistant:${companyId}`

function loadTurns(companyId: string | null): Array<Turn> {
  if (!companyId) return []
  try {
    const raw = sessionStorage.getItem(storageKey(companyId))
    return raw ? (JSON.parse(raw) as Array<Turn>) : []
  } catch {
    return []
  }
}

function saveTurns(companyId: string | null, turns: Array<Turn>) {
  if (!companyId) return
  try {
    sessionStorage.setItem(storageKey(companyId), JSON.stringify(turns))
  } catch {
    // Storage can be unavailable (private mode); the chat still works.
  }
}

export function AssistantChatPage({ initialQuestion }: { initialQuestion?: string }) {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const { companyId, company } = useWorkspace()
  const [turns, setTurns] = React.useState<Array<Turn>>(() =>
    loadTurns(companyId),
  )
  const [draft, setDraft] = React.useState('')
  const threadEndRef = React.useRef<HTMLDivElement>(null)
  const askedInitial = React.useRef(false)

  const status = useQuery(trpc.assistant.status.queryOptions())
  const ask = useMutation(trpc.assistant.ask.mutationOptions())

  React.useEffect(() => {
    setTurns(loadTurns(companyId))
  }, [companyId])

  React.useEffect(() => {
    saveTurns(companyId, turns)
    threadEndRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [companyId, turns, ask.isPending])

  function submit(text: string) {
    const question = text.trim()
    if (!question || !companyId || !company || ask.isPending) return
    const history = turns
      .filter((turn) => !turn.failed)
      .slice(-6)
      .map(({ role, content }) => ({ role, content }))
    setTurns((current) => [...current, { role: 'user', content: question }])
    setDraft('')
    ask.mutate(
      {
        companyId,
        companyStateCode: company.stateCode,
        question,
        history,
      },
      {
        onSuccess: (result) =>
          setTurns((current) => [
            ...current,
            { role: 'assistant', content: result.answer, links: result.links },
          ]),
        onError: (error) =>
          setTurns((current) => [
            ...current,
            { role: 'assistant', content: error.message, failed: true },
          ]),
      },
    )
  }

  // A question handed over in the URL (?q=) is asked once, then cleared.
  React.useEffect(() => {
    if (
      !initialQuestion ||
      askedInitial.current ||
      !status.data?.configured ||
      !company
    ) {
      return
    }
    askedInitial.current = true
    submit(initialQuestion)
    void navigate({ to: '/app/assistant', search: {}, replace: true })
  })

  const configured = status.data?.configured
  const empty = turns.length === 0 && !ask.isPending

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex h-11 shrink-0 items-center justify-between gap-2 px-3 sm:px-4"
        data-ui="chrome"
      >
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <SparklesIcon className="size-4 text-muted-foreground" />
          Ask AI
        </h1>
        {turns.length > 0 ? (
          <Button
            disabled={ask.isPending}
            onClick={() => setTurns([])}
            size="sm"
            variant="ghost"
          >
            <SquarePenIcon data-icon="inline-start" />
            New chat
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-3 py-4 sm:px-4">
          {status.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : !configured ? (
            <EmptyState title="Ask AI is not set up yet" />
          ) : empty ? (
            <EmptyState
              title={`What would you like to know about ${company?.tradeName || company?.legalName || 'your business'}?`}
            >
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((starter) => (
                  <Button
                    key={starter}
                    onClick={() => submit(starter)}
                    variant="outline"
                  >
                    {starter}
                  </Button>
                ))}
              </div>
            </EmptyState>
          ) : (
            turns.map((turn, index) =>
              turn.role === 'user' ? (
                <div
                  className="max-w-[85%] self-end rounded-2xl bg-muted px-3.5 py-2 text-sm whitespace-pre-wrap"
                  key={index}
                >
                  {turn.content}
                </div>
              ) : (
                <AssistantMessage key={index} turn={turn} />
              ),
            )
          )}
          {ask.isPending ? <WorkingMessage /> : null}
          <div ref={threadEndRef} />
        </div>
      </div>

      {configured ? (
        <div className="shrink-0 px-3 pb-3 sm:px-4 sm:pb-4">
          <form
            className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border bg-background p-2 shadow-(--elevation-1) focus-within:ring-1 focus-within:ring-ring"
            onSubmit={(event) => {
              event.preventDefault()
              submit(draft)
            }}
          >
            <Textarea
              aria-label="Ask a question about your books"
              autoFocus
              className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0"
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  submit(draft)
                }
              }}
              placeholder="Sharma Traders ka kitna baaki hai?"
              rows={1}
              value={draft}
            />
            <Button
              aria-label="Send"
              className="rounded-full"
              disabled={!draft.trim() || ask.isPending}
              size="icon"
              type="submit"
            >
              <ArrowUpIcon />
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function EmptyState({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col items-center gap-4 py-10 text-center sm:py-16"
      data-hero-surface=""
      data-ui="chrome"
    >
      <span className="icon-duotone flex size-12 items-center justify-center rounded-full">
        <SparklesIcon className="size-6" />
      </span>
      <h2 className="max-w-md text-lg font-semibold tracking-tight text-balance">
        {title}
      </h2>
      {children}
    </div>
  )
}

function AssistantAvatar() {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
      <SparklesIcon className="size-3.5" />
    </span>
  )
}

function AssistantMessage({ turn }: { turn: Turn }) {
  return (
    <div className="flex max-w-[95%] gap-2.5 self-start">
      <AssistantAvatar />
      <div className="flex min-w-0 flex-col gap-2 pt-1 text-sm">
        <p
          className={
            turn.failed
              ? 'whitespace-pre-wrap text-destructive'
              : 'whitespace-pre-wrap'
          }
        >
          {turn.content}
        </p>
        {turn.links?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {turn.links.map((link) => (
              <Button asChild key={link.href} size="sm" variant="outline">
                <Link to={link.href}>
                  {link.label}
                  <ArrowUpRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function WorkingMessage() {
  const [step, setStep] = React.useState(0)
  React.useEffect(() => {
    const timer = window.setInterval(
      () => setStep((current) => Math.min(current + 1, WORKING_STEPS.length - 1)),
      1800,
    )
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="flex items-center gap-2.5 self-start" role="status">
      <AssistantAvatar />
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        {WORKING_STEPS[step]}
      </span>
    </div>
  )
}
