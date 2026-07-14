import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2Icon, PlusIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  indianStates,
  stateLabel,
} from '#/features/app-shell/data/india-masters.ts'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import type { BusinessType } from '#/features/companies/company-service.ts'

export function CompaniesPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companies: workspaceCompanies, refresh } = useWorkspace()
  const [open, setOpen] = React.useState(false)
  const [legalName, setLegalName] = React.useState('')
  const [tradeName, setTradeName] = React.useState('')
  const [gstin, setGstin] = React.useState('')
  const [stateCode, setStateCode] = React.useState('27')
  const [businessType, setBusinessType] =
    React.useState<BusinessType>('wholesale')
  const [financialYearStart, setFinancialYearStart] =
    React.useState('2026-04-01')
  const [formError, setFormError] = React.useState<string | null>(null)

  const companiesQuery = useQuery(trpc.companies.list.queryOptions())
  const createCompany = useMutation(
    trpc.companies.createWithSetup.mutationOptions(),
  )

  const companies = companiesQuery.data ?? workspaceCompanies

  function resetForm() {
    setLegalName('')
    setTradeName('')
    setGstin('')
    setStateCode('27')
    setBusinessType('wholesale')
    setFinancialYearStart('2026-04-01')
    setFormError(null)
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!legalName.trim() || !tradeName.trim()) return

    setFormError(null)
    try {
      await createCompany.mutateAsync({
        legalName: legalName.trim(),
        tradeName: tradeName.trim(),
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
        stateCode,
        businessType,
        financialYearStart,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.companies.list.queryKey(),
      })
      await refresh()
      resetForm()
      setOpen(false)
    } catch (error) {
      setFormError(getFormErrorMessage(error, 'Create failed'))
    }
  }

  return (
    <WorkspacePage
      actions={
        <Dialog
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) resetForm()
          }}
          open={open}
        >
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              New company
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New company</DialogTitle>
              <DialogDescription>
                Creates firm profile and seeds chart of accounts automatically.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={handleCreate}>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="co-legal">
                  Legal name
                </label>
                <Input
                  id="co-legal"
                  onChange={(event) => setLegalName(event.target.value)}
                  required
                  value={legalName}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="co-trade">
                  Trade name
                </label>
                <Input
                  id="co-trade"
                  onChange={(event) => setTradeName(event.target.value)}
                  required
                  value={tradeName}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="co-gstin">
                    GSTIN
                  </label>
                  <Input
                    id="co-gstin"
                    onChange={(event) => setGstin(event.target.value)}
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
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Business type</span>
                  <Select
                    onValueChange={(value) =>
                      setBusinessType(value as BusinessType)
                    }
                    value={businessType}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="trading">Trading</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="distribution">
                          Distribution
                        </SelectItem>
                        <SelectItem value="manufacturing_light">
                          Manufacturing light
                        </SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="co-fy">
                    FY start
                  </label>
                  <Input
                    id="co-fy"
                    onChange={(event) =>
                      setFinancialYearStart(event.target.value)
                    }
                    required
                    type="date"
                    value={financialYearStart}
                  />
                </div>
              </div>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <DialogFooter>
                <Button disabled={createCompany.isPending} type="submit">
                  {createCompany.isPending ? 'Creating…' : 'Create company'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
      description="Multi-company profiles wired to the companies API."
      title="Companies"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2Icon className="size-4 text-muted-foreground" />
            Company directory
          </CardTitle>
          <CardDescription>
            {companies.length} firms on this account
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trade name</TableHead>
                <TableHead>Legal name</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>FY start</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    {company.tradeName}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {company.legalName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {company.gstin ?? '—'}
                  </TableCell>
                  <TableCell className="truncate">
                    {stateLabel(company.stateCode)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{company.businessType}</Badge>
                  </TableCell>
                  <TableCell>{company.financialYearStart}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
