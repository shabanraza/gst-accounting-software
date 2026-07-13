import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

type JournalLine = {
  key: string
  ledgerAccountId: string
  debit: string
  credit: string
}

function emptyLine(): JournalLine {
  return {
    key: crypto.randomUUID(),
    ledgerAccountId: '',
    debit: '',
    credit: '',
  }
}

export function JournalEntryPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady } = useWorkspace()
  const [entryDate, setEntryDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [narration, setNarration] = React.useState('')
  const [lines, setLines] = React.useState<Array<JournalLine>>([
    emptyLine(),
    emptyLine(),
  ])
  const [error, setError] = React.useState<string | null>(null)

  const ledgersQuery = useQuery({
    ...trpc.accounting.listLedgerAccounts.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const postEntry = useMutation(
    trpc.accounting.postLedgerEntry.mutationOptions(),
  )

  const accounts = ledgersQuery.data ?? []

  function updateLine(key: string, patch: Partial<JournalLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!companyId) return
    setError(null)

    const filled = lines.filter(
      (line) => line.ledgerAccountId && (line.debit || line.credit),
    )
    if (filled.length < 2) {
      setError('Add at least two ledger lines')
      return
    }

    try {
      await postEntry.mutateAsync({
        companyId,
        entryDate,
        narration: narration.trim() || 'Journal entry',
        voucherType: 'journal',
        lines: filled.map((line) => ({
          ledgerAccountId: line.ledgerAccountId,
          debit: line.debit || '0.00',
          credit: line.credit || '0.00',
        })),
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.accounting.listLedgerAccounts.queryKey({ companyId }),
      })
      toast.success('Journal entry posted')
      setNarration('')
      setLines([emptyLine(), emptyLine()])
    } catch (err) {
      setError(getFormErrorMessage(err, 'Post failed'))
    }
  }

  return (
    <WorkspacePage
      description="Manual double-entry journal vouchers."
      title="Journal"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journal entry</CardTitle>
          <CardDescription>Minimum two lines; debits must equal credits.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                onChange={(event) => setEntryDate(event.target.value)}
                type="date"
                value={entryDate}
              />
              <Textarea
                onChange={(event) => setNarration(event.target.value)}
                placeholder="Narration"
                rows={1}
                value={narration}
              />
            </div>
            <div className="flex flex-col gap-2">
              {lines.map((line) => (
                <div
                  className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                  key={line.key}
                >
                  <Select
                    onValueChange={(value) =>
                      updateLine(line.key, { ledgerAccountId: value })
                    }
                    value={line.ledgerAccountId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ledger account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.code} · {account.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Input
                    onChange={(event) =>
                      updateLine(line.key, {
                        debit: event.target.value,
                        credit: '',
                      })
                    }
                    placeholder="Debit"
                    value={line.debit}
                  />
                  <Input
                    onChange={(event) =>
                      updateLine(line.key, {
                        credit: event.target.value,
                        debit: '',
                      })
                    }
                    placeholder="Credit"
                    value={line.credit}
                  />
                  <Button
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      setLines((current) =>
                        current.length <= 2
                          ? current
                          : current.filter((entry) => entry.key !== line.key),
                      )
                    }
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setLines((current) => [...current, emptyLine()])}
                type="button"
              >
                <PlusIcon data-icon="inline-start" />
                Add line
              </Button>
              <Button disabled={postEntry.isPending} type="submit">
                Post journal
              </Button>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </form>
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
