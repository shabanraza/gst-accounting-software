import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { advanceRunDate } from '#/features/sales/recurring-invoice-service.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { RecurringFrequency } from '#/features/sales/recurring-invoice-service.ts'

export type RepeatInvoiceTarget = {
  id: string
  invoiceNumber: string
  invoiceDate: string
}

export const frequencyLabels: Record<RecurringFrequency, string> = {
  weekly: 'Every week',
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  yearly: 'Every year',
}

export function RepeatInvoiceDialog({
  target,
  onOpenChange,
}: {
  target: RepeatInvoiceTarget | null
  onOpenChange: (open: boolean) => void
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const [frequency, setFrequency] =
    React.useState<RecurringFrequency>('monthly')
  const [startDate, setStartDate] = React.useState('')
  const [ends, setEnds] = React.useState<'never' | 'on'>('never')
  const [endDate, setEndDate] = React.useState('')
  const createRecurring = useMutation(
    trpc.recurringInvoices.create.mutationOptions(),
  )

  React.useEffect(() => {
    if (!target) return
    setFrequency('monthly')
    setStartDate(
      advanceRunDate(target.invoiceDate, target.invoiceDate, 'monthly'),
    )
    setEnds('never')
    setEndDate('')
  }, [target])

  function changeFrequency(value: RecurringFrequency) {
    setFrequency(value)
    if (target) {
      setStartDate(
        advanceRunDate(target.invoiceDate, target.invoiceDate, value),
      )
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!target || !companyId) return
    if (ends === 'on' && !endDate) {
      toast.error('Pick the end date')
      return
    }
    try {
      await createRecurring.mutateAsync({
        companyId,
        invoiceId: target.id,
        frequency,
        startDate,
        endDate: ends === 'on' ? endDate : null,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.recurringInvoices.list.pathKey(),
      })
      onOpenChange(false)
      toast.success(`${target.invoiceNumber} will repeat`, {
        action: (
          <Button asChild size="sm" variant="outline">
            <Link to="/app/sales/recurring">View</Link>
          </Button>
        ),
      })
    } catch (error) {
      toastActionError(error, 'Could not set up the recurring invoice')
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={target !== null}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Repeat {target?.invoiceNumber}</DialogTitle>
          <DialogDescription>
            A new invoice with the same customer, items and rates is created on
            each date, with its own invoice number.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Repeats</span>
            <Select
              onValueChange={(value) =>
                changeFrequency(value as RecurringFrequency)
              }
              value={frequency}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {(
                    Object.keys(frequencyLabels) as Array<RecurringFrequency>
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {frequencyLabels[value]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm" htmlFor="recurring-start">
                First invoice on
              </Label>
              <DatePicker
                id="recurring-start"
                onChange={setStartDate}
                required
                value={startDate}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Ends</span>
              <Select
                onValueChange={(value) => setEnds(value as 'never' | 'on')}
                value={ends}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="on">On a date</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
          {ends === 'on' ? (
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm" htmlFor="recurring-end">
                Last invoice on or before
              </Label>
              <DatePicker
                id="recurring-end"
                min={startDate}
                onChange={setEndDate}
                value={endDate}
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button disabled={createRecurring.isPending} type="submit">
              Set up recurring invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
