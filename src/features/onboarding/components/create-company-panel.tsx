import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { indianStates } from '#/features/app-shell/data/india-masters.ts'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { WORKSPACE_COMPANY_KEY } from '#/features/app-shell/workspace.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { BusinessType } from '#/features/companies/company-service.ts'

const businessTypes: Array<{ value: BusinessType; label: string }> = [
  { value: 'wholesale', label: 'Wholesale / trading' },
  { value: 'retail', label: 'Retail' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'manufacturing_light', label: 'Manufacturing' },
  { value: 'services', label: 'Services' },
  { value: 'custom', label: 'Other' },
]

const steps = ['Company', 'Tax & books', 'Business type'] as const

export function CreateCompanyPanel() {
  const navigate = useNavigate()
  const trpc = useTRPC()
  const createWithSetup = useMutation(
    trpc.companies.createWithSetup.mutationOptions(),
  )

  const [step, setStep] = React.useState(0)
  const [legalName, setLegalName] = React.useState('')
  const [tradeName, setTradeName] = React.useState('')
  const [gstin, setGstin] = React.useState('')
  const [stateCode, setStateCode] = React.useState('27')
  const [financialYearStart, setFinancialYearStart] = React.useState('2026-04-01')
  const [businessType, setBusinessType] =
    React.useState<BusinessType>('wholesale')

  const canContinueStep0 = legalName.trim() && tradeName.trim()
  const canContinueStep1 = stateCode && financialYearStart

  async function handleFinish() {
    try {
      const result = await createWithSetup.mutateAsync({
        legalName: legalName.trim(),
        tradeName: tradeName.trim(),
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
        stateCode,
        financialYearStart,
        businessType,
      })
      window.localStorage.setItem(WORKSPACE_COMPANY_KEY, result.company.id)
      void navigate({ to: '/app/dashboard' })
    } catch (err) {
      toastActionError(err, 'Unable to create company')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <Card className="w-full max-w-lg" size="sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            {steps.map((label, index) => (
              <div className="flex flex-1 items-center gap-2" key={label}>
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-sm font-medium ${
                    index <= step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index < step ? <CheckIcon className="size-3" /> : index + 1}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <CardTitle className="text-lg">Set up your company</CardTitle>
          <CardDescription>
            We will seed your chart of accounts, financial year, and ledgers
            automatically.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3">
          {step === 0 ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="ob-legal">
                  Legal name
                </label>
                <Input
                  id="ob-legal"
                  onChange={(event) => setLegalName(event.target.value)}
                  placeholder="Shaban Textiles Private Limited"
                  value={legalName}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="ob-trade">
                  Trade name
                </label>
                <Input
                  id="ob-trade"
                  onChange={(event) => setTradeName(event.target.value)}
                  placeholder="Shaban Textiles"
                  value={tradeName}
                />
              </div>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="ob-gstin">
                  GSTIN (optional)
                </label>
                <Input
                  id="ob-gstin"
                  onChange={(event) => setGstin(event.target.value)}
                  placeholder="27ABCDE1234F1Z5"
                  value={gstin}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">State</span>
                <Select onValueChange={setStateCode} value={stateCode}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                <label className="text-sm font-medium" htmlFor="ob-fy">
                  Financial year start
                </label>
                <Input
                  id="ob-fy"
                  onChange={(event) => setFinancialYearStart(event.target.value)}
                  type="date"
                  value={financialYearStart}
                />
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <div className="grid grid-cols-2 gap-2">
              {businessTypes.map((type) => (
                <button
                  className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition-colors ${
                    businessType === type.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  key={type.value}
                  onClick={() => setBusinessType(type.value)}
                  type="button"
                >
                  <span className="font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex justify-between gap-3">
          <Button
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            type="button"
            variant="outline"
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back
          </Button>
          {step < 2 ? (
            <Button
              disabled={step === 0 ? !canContinueStep0 : !canContinueStep1}
              onClick={() => setStep((current) => current + 1)}
              type="button"
            >
              Continue
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <Button
              disabled={createWithSetup.isPending}
              onClick={() => void handleFinish()}
              type="button"
            >
              {createWithSetup.isPending ? 'Creating…' : 'Create company'}
              <CheckIcon data-icon="inline-end" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
