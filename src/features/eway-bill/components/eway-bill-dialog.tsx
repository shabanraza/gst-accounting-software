import * as React from 'react'
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { DownloadIcon, ExternalLinkIcon, Trash2Icon } from 'lucide-react'
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
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '#/components/ui/tabs.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { defaultValidUntil } from '#/features/eway-bill/eway-bill-service.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { localCalendarDate } from '#/lib/calendar-date.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type {
  EWayBillChallanReason,
  EWayBillTransportMode,
  EWayBillVehicleType,
} from '#/features/eway-bill/eway-bill-service.ts'

export type EWayBillTarget = {
  kind: 'invoice' | 'challan'
  id: string
  number: string
}

const modeLabels: Record<EWayBillTransportMode, string> = {
  road: 'Road',
  rail: 'Rail',
  air: 'Air',
  ship: 'Ship',
}

const reasonLabels: Record<EWayBillChallanReason, string> = {
  job_work: 'Job work',
  line_sales: 'Line sales',
  recipient_not_known: 'Recipient not known',
  exhibition: 'Exhibition or fair',
  for_own_use: 'For own use',
  others: 'Others',
}

function saveJsonFile(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

function Field({
  id,
  label,
  children,
}: {
  id?: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {id ? (
        <Label className="text-sm" htmlFor={id}>
          {label}
        </Label>
      ) : (
        <span className="text-sm font-medium">{label}</span>
      )}
      {children}
    </div>
  )
}

export function EWayBillDialog({
  target,
  onOpenChange,
}: {
  target: EWayBillTarget | null
  onOpenChange: (open: boolean) => void
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const source = target ? { kind: target.kind, id: target.id } : null
  const detailsQuery = useQuery(
    trpc.eWayBills.forDocument.queryOptions(
      companyId && source ? { companyId, source } : skipToken,
    ),
  )
  const details = detailsQuery.data
  const record = details?.record ?? null

  const [tab, setTab] = React.useState<'json' | 'save'>('json')
  const [mode, setMode] = React.useState<EWayBillTransportMode>('road')
  const [distance, setDistance] = React.useState('')
  const [vehicleNumber, setVehicleNumber] = React.useState('')
  const [vehicleType, setVehicleType] =
    React.useState<EWayBillVehicleType>('regular')
  const [transporterId, setTransporterId] = React.useState('')
  const [transporterName, setTransporterName] = React.useState('')
  const [transportDocNumber, setTransportDocNumber] = React.useState('')
  const [transportDocDate, setTransportDocDate] = React.useState('')
  const [reason, setReason] = React.useState<EWayBillChallanReason>('job_work')
  const [reasonText, setReasonText] = React.useState('')
  const [deliveryPincode, setDeliveryPincode] = React.useState('')
  const [ewbNumber, setEwbNumber] = React.useState('')
  const [ewbDate, setEwbDate] = React.useState('')
  const [validUntil, setValidUntil] = React.useState('')

  const loadedFor = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!target) {
      loadedFor.current = null
      return
    }
    if (!details || loadedFor.current === target.id) return
    loadedFor.current = target.id
    const saved = details.record
    setTab(saved ? 'save' : 'json')
    setMode(saved?.transportMode ?? 'road')
    setDistance(saved ? String(saved.distanceKm) : '')
    setVehicleNumber(saved?.vehicleNumber ?? details.prefill.vehicleNumber)
    setVehicleType('regular')
    setTransporterId(saved?.transporterId ?? '')
    setTransporterName(saved?.transporterName ?? '')
    setTransportDocNumber(details.prefill.transportDocNumber)
    setTransportDocDate('')
    setReason('job_work')
    setReasonText('')
    setDeliveryPincode(details.deliveryPincode)
    setEwbNumber(saved?.ewbNumber ?? '')
    setEwbDate(saved?.ewbDate ?? localCalendarDate(new Date()))
    setValidUntil(saved?.validUntil ?? '')
  }, [target, details])

  const distanceKm = Number.parseInt(distance || '0', 10)
  const suggestedValidUntil = Number.isFinite(distanceKm)
    ? (defaultValidUntil(ewbDate, distanceKm, vehicleType) ?? '')
    : ''

  const buildJson = useMutation(trpc.eWayBills.buildJson.mutationOptions())
  const saveRecord = useMutation(trpc.eWayBills.record.mutationOptions())
  const removeRecord = useMutation(trpc.eWayBills.remove.mutationOptions())

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.eWayBills.forDocument.pathKey(),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.eWayBills.invoiceStatuses.pathKey(),
      }),
    ])
  }

  async function handleDownload(event: React.FormEvent) {
    event.preventDefault()
    if (!companyId || !source || !target) return
    try {
      const result = await buildJson.mutateAsync({
        companyId,
        source,
        deliveryPincode,
        transport: {
          mode,
          distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
          vehicleNumber: mode === 'road' ? vehicleNumber : '',
          vehicleType,
          transporterId,
          transporterName,
          transportDocNumber: mode === 'road' ? '' : transportDocNumber,
          transportDocDate: mode === 'road' ? '' : transportDocDate,
          subSupplyType: target.kind === 'challan' ? reason : undefined,
          subSupplyDescription:
            target.kind === 'challan' ? reasonText : undefined,
        },
      })
      saveJsonFile(JSON.stringify(result.json, null, 2), result.fileName)
      setTab('save')
      toast.success(`Downloaded ${result.fileName}`)
    } catch (error) {
      toastActionError(error, 'Could not make the e-way bill JSON')
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!companyId || !source || !target) return
    if (!validUntil && !suggestedValidUntil) {
      toast.error('Enter the valid-until date from the portal')
      return
    }
    try {
      await saveRecord.mutateAsync({
        companyId,
        source,
        ewbNumber,
        ewbDate,
        validUntil: validUntil || suggestedValidUntil,
        vehicleNumber: mode === 'road' ? vehicleNumber : '',
        transportMode: mode,
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
        transporterId,
        transporterName,
      })
      await refresh()
      onOpenChange(false)
      toast.success(`E-way bill saved on ${target.number}`)
    } catch (error) {
      toastActionError(error, 'Could not save the e-way bill')
    }
  }

  async function handleRemove() {
    if (!companyId || !record) return
    try {
      await removeRecord.mutateAsync({ companyId, id: record.id })
      await refresh()
      setEwbNumber('')
      setValidUntil('')
      toast.success('E-way bill number removed')
    } catch (error) {
      toastActionError(error, 'Could not remove the e-way bill')
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={target !== null}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>E-way bill for {target?.number}</DialogTitle>
          {details ? (
            <DialogDescription>
              Goods value {formatInr(details.consignmentValue)} · needed above{' '}
              {formatInr(details.threshold)}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {details && !details.companyHasGstin ? (
          <p className="text-sm text-muted-foreground">
            Add your GSTIN in the company profile to make e-way bills.
          </p>
        ) : details ? (
          <Tabs
            onValueChange={(value) => setTab(value as 'json' | 'save')}
            value={tab}
          >
            <TabsList className="w-full">
              <TabsTrigger value="json">1. Download JSON</TabsTrigger>
              <TabsTrigger value="save">2. Save EWB number</TabsTrigger>
            </TabsList>
            <TabsContent value="json">
              <form
                className="flex flex-col gap-4 pt-2"
                onSubmit={handleDownload}
              >
                {target?.kind === 'challan' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Reason for moving">
                      <Select
                        onValueChange={(value) =>
                          setReason(value as EWayBillChallanReason)
                        }
                        value={reason}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {(
                              Object.keys(
                                reasonLabels,
                              ) as Array<EWayBillChallanReason>
                            ).map((value) => (
                              <SelectItem key={value} value={value}>
                                {reasonLabels[value]}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    {reason === 'others' ? (
                      <Field id="ewb-reason" label="Describe">
                        <Input
                          id="ewb-reason"
                          maxLength={20}
                          onChange={(event) =>
                            setReasonText(event.target.value)
                          }
                          required
                          value={reasonText}
                        />
                      </Field>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Transport by">
                    <Select
                      onValueChange={(value) =>
                        setMode(value as EWayBillTransportMode)
                      }
                      value={mode}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {(
                            Object.keys(
                              modeLabels,
                            ) as Array<EWayBillTransportMode>
                          ).map((value) => (
                            <SelectItem key={value} value={value}>
                              {modeLabels[value]}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field id="ewb-distance" label="Distance (km)">
                    <Input
                      id="ewb-distance"
                      inputMode="numeric"
                      max={4000}
                      min={0}
                      onChange={(event) => setDistance(event.target.value)}
                      placeholder="0 = auto"
                      type="number"
                      value={distance}
                    />
                  </Field>
                </div>
                {mode === 'road' ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="ewb-vehicle" label="Vehicle number">
                      <Input
                        autoCapitalize="characters"
                        id="ewb-vehicle"
                        onChange={(event) =>
                          setVehicleNumber(event.target.value)
                        }
                        placeholder="MH12AB1234"
                        value={vehicleNumber}
                      />
                    </Field>
                    <Field label="Vehicle type">
                      <Select
                        onValueChange={(value) =>
                          setVehicleType(value as EWayBillVehicleType)
                        }
                        value={vehicleType}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="regular">Regular</SelectItem>
                            <SelectItem value="odc">
                              Over-dimensional cargo
                            </SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="ewb-doc-no" label="RR / airway bill / B/L no.">
                      <Input
                        id="ewb-doc-no"
                        maxLength={15}
                        onChange={(event) =>
                          setTransportDocNumber(event.target.value)
                        }
                        required
                        value={transportDocNumber}
                      />
                    </Field>
                    <Field id="ewb-doc-date" label="Document date">
                      <DatePicker
                        id="ewb-doc-date"
                        onChange={setTransportDocDate}
                        required
                        value={transportDocDate}
                      />
                    </Field>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="ewb-transporter-id" label="Transporter ID">
                    <Input
                      autoCapitalize="characters"
                      id="ewb-transporter-id"
                      maxLength={15}
                      onChange={(event) => setTransporterId(event.target.value)}
                      placeholder="GSTIN or TRANSIN"
                      value={transporterId}
                    />
                  </Field>
                  <Field id="ewb-transporter-name" label="Transporter name">
                    <Input
                      id="ewb-transporter-name"
                      onChange={(event) =>
                        setTransporterName(event.target.value)
                      }
                      value={transporterName}
                    />
                  </Field>
                </div>
                <Field id="ewb-pincode" label="Delivery PIN code">
                  <Input
                    id="ewb-pincode"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => setDeliveryPincode(event.target.value)}
                    required
                    value={deliveryPincode}
                  />
                </Field>
                <DialogFooter className="gap-2 sm:justify-between">
                  <Button asChild type="button" variant="outline">
                    <a
                      href={details.portalUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLinkIcon data-icon="inline-start" />
                      Open e-way bill portal
                    </a>
                  </Button>
                  <Button
                    disabled={buildJson.isPending || details.cancelled}
                    type="submit"
                  >
                    <DownloadIcon data-icon="inline-start" />
                    Download JSON
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
            <TabsContent value="save">
              <form className="flex flex-col gap-4 pt-2" onSubmit={handleSave}>
                <Field id="ewb-number" label="E-way bill number">
                  <Input
                    className="font-mono"
                    id="ewb-number"
                    inputMode="numeric"
                    onChange={(event) => setEwbNumber(event.target.value)}
                    placeholder="12 or 14 digits"
                    required
                    value={ewbNumber}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="ewb-date" label="Generated on">
                    <DatePicker
                      id="ewb-date"
                      onChange={setEwbDate}
                      required
                      value={ewbDate}
                    />
                  </Field>
                  <Field id="ewb-valid" label="Valid until">
                    <DatePicker
                      id="ewb-valid"
                      min={ewbDate}
                      onChange={setValidUntil}
                      required
                      value={validUntil || suggestedValidUntil}
                    />
                  </Field>
                </div>
                {mode === 'road' ? (
                  <Field id="ewb-save-vehicle" label="Vehicle number">
                    <Input
                      autoCapitalize="characters"
                      id="ewb-save-vehicle"
                      onChange={(event) => setVehicleNumber(event.target.value)}
                      value={vehicleNumber}
                    />
                  </Field>
                ) : null}
                <DialogFooter className="gap-2 sm:justify-between">
                  {record ? (
                    <Button
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={removeRecord.isPending}
                      onClick={() => void handleRemove()}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon data-icon="inline-start" />
                      Remove
                    </Button>
                  ) : (
                    <span />
                  )}
                  <Button disabled={saveRecord.isPending} type="submit">
                    Save e-way bill
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
