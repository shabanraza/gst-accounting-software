import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon, MessageCircleQuestionIcon, SendIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { AssistantLink } from '#/features/assistant/assistant-tools.ts'

type Turn = {
  role: 'user' | 'assistant'
  content: string
  links?: Array<AssistantLink>
  failed?: boolean
}

const EXAMPLES = [
  'GST payable this month?',
  'Top items sold this month',
  'Cash aur bank mein kitna hai?',
]

/** Header button plus the "Ask your books" sheet (Alt+A). */
export function AskBooksButton() {
  const { capabilities } = useWorkspace()
  const [open, setOpen] = React.useState(false)
  const allowed = capabilities.includes('view_reports')

  React.useEffect(() => {
    if (!allowed) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === 'KeyA' &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [allowed])

  if (!allowed) return null

  return (
    <>
      <Button
        aria-label="Ask your books"
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
      >
        <MessageCircleQuestionIcon data-icon="inline-start" />
        <span className="hidden md:inline">Ask</span>
      </Button>
      <Sheet onOpenChange={setOpen} open={open}>
        <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
          {open ? <AskBooksPanel /> : null}
        </SheetContent>
      </Sheet>
    </>
  )
}

function AskBooksPanel() {
  const trpc = useTRPC()
  const { companyId, company } = useWorkspace()
  const [question, setQuestion] = React.useState('')
  const [turns, setTurns] = React.useState<Array<Turn>>([])
  const endRef = React.useRef<HTMLDivElement>(null)

  const status = useQuery(trpc.assistant.status.queryOptions())
  const ask = useMutation(trpc.assistant.ask.mutationOptions())

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [turns, ask.isPending])

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed || !companyId || !company || ask.isPending) return
    const history = turns
      .filter((turn) => !turn.failed)
      .slice(-10)
      .map(({ role, content }) => ({ role, content }))
    setTurns((current) => [...current, { role: 'user', content: trimmed }])
    setQuestion('')
    ask.mutate(
      {
        companyId,
        companyStateCode: company.stateCode,
        question: trimmed,
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

  return (
    <>
      <SheetHeader>
        <SheetTitle>Ask your books</SheetTitle>
        <SheetDescription>
          Answers come from {company?.tradeName || company?.legalName || 'this company'}'s own data.
        </SheetDescription>
      </SheetHeader>
      {status.isPending ? (
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : !status.data?.configured ? (
        <div className="p-4 text-sm text-muted-foreground" data-ui="chrome">
          Ask your books is not configured yet.
        </div>
      ) : (
        <>
          <div
            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4"
            data-ui="data"
          >
            {turns.length === 0 ? (
              <div className="flex flex-col items-start gap-2">
                {EXAMPLES.map((example) => (
                  <Button
                    key={example}
                    onClick={() => submit(example)}
                    size="sm"
                    variant="outline"
                  >
                    {example}
                  </Button>
                ))}
              </div>
            ) : null}
            {turns.map((turn, index) => (
              <div
                className={
                  turn.role === 'user'
                    ? 'max-w-[85%] self-end rounded-lg bg-muted px-3 py-2 text-sm'
                    : 'flex max-w-[95%] flex-col gap-2 self-start text-sm'
                }
                key={index}
              >
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
                      <Button asChild key={link.href} size="xs" variant="outline">
                        <Link to={link.href}>
                          {link.label}
                          <ArrowUpRightIcon data-icon="inline-end" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {ask.isPending ? (
              <div className="flex flex-col gap-2 self-start">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
          <form
            className="flex gap-2 border-t p-4"
            onSubmit={(event) => {
              event.preventDefault()
              submit(question)
            }}
          >
            <Input
              aria-label="Question"
              autoFocus
              maxLength={1000}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Sharma Traders ka kitna baaki hai?"
              value={question}
            />
            <Button
              aria-label="Ask"
              disabled={!question.trim() || ask.isPending}
              type="submit"
            >
              <SendIcon data-icon="inline-start" />
            </Button>
          </form>
        </>
      )}
    </>
  )
}
