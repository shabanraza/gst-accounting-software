import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  indianStates,
  paymentTermsOptions,
} from '#/features/app-shell/data/india-masters.ts'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import type { PartyRecord, PartyType } from '#/features/parties/party-service.ts'

type CreatePartyDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onCreated?: (party: PartyRecord) => void
  defaultPartyType?: PartyType
  lockPartyType?: boolean
}

export function CreatePartyDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onCreated,
  defaultPartyType = 'customer',
  lockPartyType = false,
}: CreatePartyDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey, isReady, error: workspaceError } =
    useWorkspace()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  const [name, setName] = React.useState('')
  const [partyType, setPartyType] = React.useState<PartyType>(defaultPartyType)
  const [gstin, setGstin] = React.useState('')
  const [stateCode, setStateCode] = React.useState('27')
  const [creditLimit, setCreditLimit] = React.useState('')
  const [paymentTermsDays, setPaymentTermsDays] = React.useState('30')
  const [priceListId, setPriceListId] = React.useState('')
  const [formError, setFormError] = React.useState<string | null>(null)

  const priceListsQuery = useQuery({
    ...trpc.inventory.listPriceLists.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const createParty = useMutation(trpc.parties.create.mutationOptions())

  React.useEffect(() => {
    if (open) {
      setPartyType(defaultPartyType)
    }
  }, [open, defaultPartyType])

  function resetForm() {
    setName('')
    setPartyType(defaultPartyType)
    setGstin('')
    setStateCode('27')
    setCreditLimit('')
    setPaymentTermsDays('30')
    setPriceListId('')
    setFormError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) resetForm()
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyId) {
      setFormError(
        isReady
          ? (workspaceError ?? 'No active company. Open Companies and create one.')
          : 'Workspace is still loading. Try again in a moment.',
      )
      return
    }
    if (!name.trim()) return

    const receivableAccountId = ledgerBySystemKey.customer_receivable ?? null
    const payableAccountId = ledgerBySystemKey.supplier_payable ?? null

    if (
      (partyType === 'customer' || partyType === 'both') &&
      !receivableAccountId
    ) {
      setFormError('Receivable ledger is missing for this company')
      return
    }
    if (
      (partyType === 'supplier' || partyType === 'both') &&
      !payableAccountId
    ) {
      setFormError('Payable ledger is missing for this company')
      return
    }

    setFormError(null)
    try {
      const party = await createParty.mutateAsync({
        companyId,
        name: name.trim(),
        partyType,
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
        stateCode,
        creditLimit: creditLimit.trim() || null,
        paymentTermsDays: Number(paymentTermsDays) || 0,
        receivableAccountId:
          partyType === 'supplier' ? null : receivableAccountId,
        payableAccountId: partyType === 'customer' ? null : payableAccountId,
        priceListId: priceListId || null,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.parties.list.queryKey({ companyId }),
      })
      resetForm()
      setOpen(false)
      onCreated?.(party)
    } catch (error) {
      setFormError(getFormErrorMessage(error))
    }
  }

  const dialog = (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>New party</DialogTitle>
        <DialogDescription>
          Customer / supplier master with GST state and credit terms.
        </DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-3" onSubmit={handleCreate}>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" htmlFor="party-name">
            Name
          </label>
          <Input
            id="party-name"
            onChange={(event) => setName(event.target.value)}
            placeholder="Party legal / trade name"
            required
            value={name}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {!lockPartyType ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">Type</span>
              <Select
                onValueChange={(value) => setPartyType(value as PartyType)}
                value={partyType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectGroup>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="supplier">Supplier</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div
            className={
              lockPartyType ? 'flex flex-col gap-1.5 sm:col-span-2' : 'flex flex-col gap-1.5'
            }
          >
            <span className="text-xs font-medium">State / POS</span>
            <Select onValueChange={setStateCode} value={stateCode}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {indianStates.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" htmlFor="party-gstin">
              GSTIN
            </label>
            <Input
              id="party-gstin"
              onChange={(event) => setGstin(event.target.value)}
              placeholder="Optional · unregistered if blank"
              value={gstin}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Payment terms</span>
            <Select
              onValueChange={setPaymentTermsDays}
              value={paymentTermsDays}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  {paymentTermsOptions.map((term) => (
                    <SelectItem key={term.days} value={String(term.days)}>
                      {term.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" htmlFor="party-credit">
            Credit limit
          </label>
          <Input
            id="party-credit"
            onChange={(event) => setCreditLimit(event.target.value)}
            placeholder="e.g. 100000.00"
            value={creditLimit}
          />
        </div>
        {(partyType === 'customer' || partyType === 'both') &&
        (priceListsQuery.data ?? []).length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Price list</span>
            <Select
              onValueChange={(value) =>
                setPriceListId(value === 'none' ? '' : value)
              }
              value={priceListId || 'none'}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Default item rates" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectGroup>
                  <SelectItem value="none">Default item rates</SelectItem>
                  {(priceListsQuery.data ?? []).map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {formError ? (
          <p className="text-sm text-destructive">{formError}</p>
        ) : null}
        <DialogFooter>
          <Button disabled={createParty.isPending} type="submit">
            {createParty.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )

  if (trigger) {
    return (
      <Dialog onOpenChange={handleOpenChange} open={open}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialog}
      </Dialog>
    )
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      {dialog}
    </Dialog>
  )
}
