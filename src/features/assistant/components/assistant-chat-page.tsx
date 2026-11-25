import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  SquarePenIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '#/components/ui/avatar.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty.tsx'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from '#/components/ui/input-group.tsx'
import { Kbd } from '#/components/ui/kbd.tsx'
import { ScrollArea } from '#/components/ui/scroll-area.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
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

/** Server messages are user-facing; bare tRPC codes (e.g. FORBIDDEN) are not. */
function friendlyError(message: string) {
  return /^[A-Z_]+$/.test(message)
    ? 'Sorry, something went wrong. Please try again.'
    : message
}

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

export function AssistantChatPage({
  initialQuestion,
}: {
  initialQuestion?: string
}) {
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
  }, [companyId, turns])

  // The thread renders only once status has loaded, so scroll after that too.
  React.useEffect(() => {
    const viewport = threadEndRef.current?.closest(
      '[data-slot=scroll-area-viewport]',
    )
    viewport?.scrollTo({ top: viewport.scrollHeight })
  }, [turns, ask.isPending, status.isSuccess])

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
            {
              role: 'assistant',
              content: friendlyError(error.message),
              failed: true,
            },
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
  const companyName =
    company?.tradeName || company?.legalName || 'your business'

  return (
    // The shell grows with its content, so the chat sets its own height
    // (viewport minus the 2.75rem app header and, from md, the inset margin)
    // to keep the composer pinned and scroll only the thread.
    <div className="flex h-[calc(100svh-2.75rem)] min-h-0 flex-col md:h-[calc(100svh-3.75rem)]">
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

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-3 py-4 sm:px-4">
          {status.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : !configured ? (
            <Welcome title="Ask AI is not set up yet" />
          ) : empty ? (
            <Welcome
              title={`What would you like to know about ${companyName}?`}
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
            </Welcome>
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
      </ScrollArea>

      {configured ? (
        <form
          className="mx-auto w-full max-w-3xl shrink-0 px-3 pb-3 sm:px-4 sm:pb-4"
          onSubmit={(event) => {
            event.preventDefault()
            submit(draft)
          }}
        >
          <InputGroup className="rounded-2xl bg-background">
            <InputGroupTextarea
              aria-label="Ask a question about your books"
              autoFocus
              className="max-h-40 min-h-12"
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
            <InputGroupAddon align="block-end">
              <InputGroupText className="hidden gap-1 sm:flex">
                <Kbd>Enter</Kbd> to send, <Kbd>Shift</Kbd>+<Kbd>Enter</Kbd> for
                a new line
              </InputGroupText>
              <InputGroupButton
                aria-label="Send"
                className="ml-auto rounded-full"
                disabled={!draft.trim() || ask.isPending}
                size="icon-sm"
                type="submit"
                variant="default"
              >
                {ask.isPending ? <Spinner /> : <ArrowUpIcon />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>
      ) : null}
    </div>
  )
}

function Welcome({
  title,
  children,
}: {
  title: string
  children?: React.ReactNode
}) {
  return (
    <Empty className="py-10 sm:py-16" data-hero-surface="" data-ui="chrome">
      <EmptyHeader>
        <EmptyMedia
          className="icon-duotone size-12 rounded-full"
          variant="icon"
        >
          <SparklesIcon className="size-6" />
        </EmptyMedia>
        <EmptyTitle className="text-lg">{title}</EmptyTitle>
      </EmptyHeader>
      {children ? (
        <EmptyContent className="max-w-xl">{children}</EmptyContent>
      ) : null}
    </Empty>
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

function AssistantMessage({ turn }: { turn: Turn }) {
  return (
    <div className="flex max-w-[95%] gap-2.5 self-start">
      <AssistantAvatar />
      <div className="flex min-w-0 flex-col gap-2 pt-0.5 text-sm">
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
      () =>
        setStep((current) => Math.min(current + 1, WORKING_STEPS.length - 1)),
      1800,
    )
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="flex items-center gap-2.5 self-start" role="status">
      <AssistantAvatar />
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-3.5" />
        {WORKING_STEPS[step]}
      </span>
    </div>
  )
}
