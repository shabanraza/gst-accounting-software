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
import { Textarea } from '#/components/ui/textarea.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  indianStates,
  paymentTermsOptions,
} from '#/features/app-shell/data/india-masters.ts'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import type {
  PartyRecord,
  PartyType,
} from '#/features/parties/party-service.ts'

type CreatePartyDialogProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  onCreated?: (party: PartyRecord) => void
  onUpdated?: (party: PartyRecord) => void
  party?: PartyRecord | null
  defaultPartyType?: PartyType
  lockPartyType?: boolean
}

export function CreatePartyDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
  onCreated,
  onUpdated,
  party,
  defaultPartyType = 'customer',
  lockPartyType = false,
}: CreatePartyDialogProps) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const {
    companyId,
    ledgerBySystemKey,
    isReady,
    error: workspaceError,
  } = useWorkspace()
  const isEdit = Boolean(party)
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen

  const [name, setName] = React.useState('')
  const [partyType, setPartyType] = React.useState<PartyType>(defaultPartyType)
  const [gstin, setGstin] = React.useState('')
  const [pan, setPan] = React.useState('')
  const [stateCode, setStateCode] = React.useState('27')
  const [addressLine1, setAddressLine1] = React.useState('')
  const [addressLine2, setAddressLine2] = React.useState('')
  const [city, setCity] = React.useState('')
  const [pincode, setPincode] = React.useState('')
  const [contactPhone, setContactPhone] = React.useState('')
  const [contactEmail, setContactEmail] = React.useState('')
  const [shipSameAsBilling, setShipSameAsBilling] = React.useState(true)
  const [shippingAddress, setShippingAddress] = React.useState('')
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
  const updateParty = useMutation(trpc.parties.update.mutationOptions())

  function loadPartyValues(entry: PartyRecord | null | undefined) {
    if (!entry) {
      resetForm()
      return
    }
    setName(entry.name)
    setPartyType(entry.partyType)
    setGstin(entry.gstin ?? '')
    setPan(entry.pan ?? '')
    setStateCode(entry.stateCode)
    setAddressLine1(entry.addressLine1 ?? '')
    setAddressLine2(entry.addressLine2 ?? '')
    setCity(entry.city ?? '')
    setPincode(entry.pincode ?? '')
    setContactPhone(entry.contactPhone ?? '')
    setContactEmail(entry.contactEmail ?? '')
    const hasDistinctShipping =
      Boolean(entry.shippingAddress?.trim()) &&
      entry.shippingAddress.trim() !== entry.billingAddress?.trim()
    setShipSameAsBilling(!hasDistinctShipping)
    setShippingAddress(hasDistinctShipping ? entry.shippingAddress : '')
    setCreditLimit(entry.creditLimit ?? '')
    setPaymentTermsDays(String(entry.paymentTermsDays))
    setPriceListId(entry.priceListId ?? '')
    setFormError(null)
  }

  React.useEffect(() => {
    if (open) {
      loadPartyValues(party)
      if (!party) {
        setPartyType(defaultPartyType)
      }
    }
  }, [open, party, defaultPartyType])

  function resetForm() {
    setName('')
    setPartyType(defaultPartyType)
    setGstin('')
    setPan('')
    setStateCode('27')
    setAddressLine1('')
    setAddressLine2('')
    setCity('')
    setPincode('')
    setContactPhone('')
    setContactEmail('')
    setShipSameAsBilling(true)
    setShippingAddress('')
    setCreditLimit('')
    setPaymentTermsDays('30')
    setPriceListId('')
    setFormError(null)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) resetForm()
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyId) {
      setFormError(
        isReady
          ? (workspaceError ??
              'No active company. Open Companies and create one.')
          : 'Workspace is still loading. Try again in a moment.',
      )
      return
    }
    if (!name.trim()) return

    const receivableAccountId = ledgerBySystemKey.customer_receivable ?? null
    const payableAccountId = ledgerBySystemKey.supplier_payable ?? null

    if (
      !isEdit &&
      (partyType === 'customer' || partyType === 'both') &&
      !receivableAccountId
    ) {
      setFormError('Receivable ledger is missing for this company')
      return
    }
    if (
      !isEdit &&
      (partyType === 'supplier' || partyType === 'both') &&
      !payableAccountId
    ) {
      setFormError('Payable ledger is missing for this company')
      return
    }

    const contactPayload = {
      pan: pan.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      billingAddress: '',
      shippingAddress: shipSameAsBilling ? '' : shippingAddress.trim(),
    }

    setFormError(null)
    try {
      if (isEdit && party) {
        const updated = await updateParty.mutateAsync({
          id: party.id,
          companyId,
          name: name.trim(),
          partyType,
          gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
          stateCode,
          creditLimit: creditLimit.trim() || null,
          paymentTermsDays: Number(paymentTermsDays) || 0,
          priceListId: priceListId || null,
          ...contactPayload,
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.parties.list.queryKey({ companyId }),
        })
        resetForm()
        setOpen(false)
        onUpdated?.(updated)
        return
      }

      const created = await createParty.mutateAsync({
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
        ...contactPayload,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.parties.list.queryKey({ companyId }),
      })
      resetForm()
      setOpen(false)
      onCreated?.(created)
    } catch (error) {
      setFormError(getFormErrorMessage(error))
    }
  }

  const saving = createParty.isPending || updateParty.isPending

  const dialog = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit party' : 'New party'}</DialogTitle>
        <DialogDescription>
          Billing address, GST/PAN, and contact details print on tax invoices.
        </DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="party-name">
              Name
            </label>
            <Input
              id="party-name"
              onChange={(event) => setName(event.target.value)}
              placeholder="Legal / trade name"
              required
              value={name}
            />
          </div>
          {!lockPartyType ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Type</span>
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
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">State / POS</span>
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="party-gstin">
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
            <label className="text-sm font-medium" htmlFor="party-pan">
              PAN
            </label>
            <Input
              id="party-pan"
              onChange={(event) => setPan(event.target.value)}
              placeholder="ABCDE1234F"
              value={pan}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Billing address</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="party-addr1">
                Address line 1
              </label>
              <Input
                id="party-addr1"
                onChange={(event) => setAddressLine1(event.target.value)}
                placeholder="Shop / building / street"
                value={addressLine1}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="party-addr2">
                Address line 2
              </label>
              <Input
                id="party-addr2"
                onChange={(event) => setAddressLine2(event.target.value)}
                placeholder="Area, landmark"
                value={addressLine2}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="party-city">
                City
              </label>
              <Input
                id="party-city"
                onChange={(event) => setCity(event.target.value)}
                value={city}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="party-pincode">
                PIN code
              </label>
              <Input
                id="party-pincode"
                onChange={(event) => setPincode(event.target.value)}
                value={pincode}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="party-phone">
              Phone
            </label>
            <Input
              id="party-phone"
              onChange={(event) => setContactPhone(event.target.value)}
              value={contactPhone}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="party-email">
              Email
            </label>
            <Input
              id="party-email"
              onChange={(event) => setContactEmail(event.target.value)}
              type="email"
              value={contactEmail}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={shipSameAsBilling}
              className="size-4 rounded border"
              onChange={(event) => setShipSameAsBilling(event.target.checked)}
              type="checkbox"
            />
            Ship-to same as billing
          </label>
          {!shipSameAsBilling ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="party-ship">
                Shipping address
              </label>
              <Textarea
                id="party-ship"
                onChange={(event) => setShippingAddress(event.target.value)}
                placeholder="Full ship-to address if different"
                rows={3}
                value={shippingAddress}
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Payment terms</span>
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
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="party-credit">
              Credit limit
            </label>
            <Input
              id="party-credit"
              onChange={(event) => setCreditLimit(event.target.value)}
              placeholder="e.g. 100000.00"
              value={creditLimit}
            />
          </div>
        </div>

        {(partyType === 'customer' || partyType === 'both') &&
        (priceListsQuery.data ?? []).length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Price list</span>
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
          <Button disabled={saving} type="submit">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
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
