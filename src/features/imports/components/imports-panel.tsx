import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Label } from '#/components/ui/label.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { requireTrimmed, requireWorkspace } from '#/lib/form-validation.ts'
import { parseBusyExport } from '#/features/imports/busy-format-parser.ts'
import { parseCsvRows } from '#/features/imports/csv-parser.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

type ImportMode = 'parties' | 'stock' | 'items' | 'openingBalances'

const sampleParties = `[
  { "name": "Imported Retail", "partyType": "customer", "gstin": "27AAAAA0000A1Z5", "stateCode": "27" },
  { "name": "Imported Mill", "partyType": "supplier", "gstin": "24BBBBB0000B1Z5", "stateCode": "24" }
]`

const sampleStock = `[
  { "itemName": "Imported Cotton", "quantity": "100", "unit": "Meter", "rate": "80.00" }
]`

const sampleItems = `[
  { "name": "Imported Yarn", "hsn": "5205", "rate": "120.00", "unit": "Kg" }
]`

const sampleOpeningBalances = `[
  { "ledgerCode": "1000", "openingDebit": "5000.00", "openingCredit": "0.00" },
  { "ledgerCode": "3000", "openingDebit": "0.00", "openingCredit": "5000.00" }
]`

const sampleCsvParties = `name,partyType,gstin,stateCode
Imported Retail,customer,27AAAAA0000A1Z5,27
Imported Mill,supplier,24BBBBB0000B1Z5,24`

const sampleCsvStock = `itemName,quantity,unit,rate
Imported Cotton,100,Meter,80.00`

const sampleCsvItems = `name,hsn,rate,unit
Imported Yarn,5205,120.00,Kg`

const sampleBusyParties = `Account Name\tGST No.\tState\tAccount Type
Imported Retail\t27AAAAA0000A1Z5\tMaharashtra\tCustomer
Imported Mill\t24BBBBB0000B1Z5\tGujarat\tSupplier`

const sampleBusyItems = `Item Name\tHSN/SAC\tSale Rate\tUnit
Imported Yarn\t5205\t120.00\tKg`

export function ImportsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey } = useWorkspace()
  const [mode, setMode] = React.useState<ImportMode>('parties')
  const [format, setFormat] = React.useState<'json' | 'csv' | 'busy'>('json')
  const [jsonText, setJsonText] = React.useState(sampleParties)
  const [result, setResult] = React.useState<string | null>(null)
  const [dryRunComplete, setDryRunComplete] = React.useState(false)

  function parseRows(text: string): Array<Record<string, unknown>> {
    if (format === 'busy') {
      if (mode !== 'parties' && mode !== 'items') {
        throw new Error('BUSY format supports parties and items only')
      }
      return parseBusyExport(text, mode)
    }
    if (format === 'csv') {
      return parseCsvRows(text)
    }
    return JSON.parse(text) as Array<Record<string, unknown>>
  }

  function sampleTextFor(
    nextMode: ImportMode,
    nextFormat: 'json' | 'csv' | 'busy',
  ) {
    if (nextFormat === 'busy') {
      if (nextMode === 'parties') return sampleBusyParties
      if (nextMode === 'items') return sampleBusyItems
      return sampleCsvParties
    }
    if (nextFormat === 'csv') {
      if (nextMode === 'parties') return sampleCsvParties
      if (nextMode === 'stock') return sampleCsvStock
      if (nextMode === 'items') return sampleCsvItems
      return `ledgerCode,openingDebit,openingCredit
1000,5000.00,0.00
3000,0.00,5000.00`
    }
    if (nextMode === 'parties') return sampleParties
    if (nextMode === 'stock') return sampleStock
    if (nextMode === 'items') return sampleItems
    return sampleOpeningBalances
  }

  const dryRunParties = useMutation(
    trpc.imports.dryRunParties.mutationOptions(),
  )
  const commitParties = useMutation(
    trpc.imports.commitParties.mutationOptions(),
  )
  const dryRunStock = useMutation(
    trpc.imports.dryRunOpeningStock.mutationOptions(),
  )
  const commitStock = useMutation(
    trpc.imports.commitOpeningStock.mutationOptions(),
  )
  const dryRunItems = useMutation(trpc.imports.dryRunItems.mutationOptions())
  const commitItems = useMutation(trpc.imports.commitItems.mutationOptions())
  const dryRunOpeningBalances = useMutation(
    trpc.imports.dryRunOpeningBalances.mutationOptions(),
  )
  const commitOpeningBalances = useMutation(
    trpc.imports.commitOpeningBalances.mutationOptions(),
  )

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setResult(null)
    setDryRunComplete(false)
    try {
      const text = await file.text()
      setJsonText(text)
    } catch {
      toast.error('Could not read the selected file')
    } finally {
      event.target.value = ''
    }
  }

  async function handleDryRun() {
    setResult(null)
    setDryRunComplete(false)
    if (!requireTrimmed(jsonText, 'Import data')) return
    try {
      const rows = parseRows(jsonText)
      const report =
        mode === 'parties'
          ? await dryRunParties.mutateAsync({ rows: rows as never })
          : mode === 'stock'
            ? await dryRunStock.mutateAsync({ rows: rows as never })
            : mode === 'items'
              ? await dryRunItems.mutateAsync({ rows: rows as never })
              : await dryRunOpeningBalances.mutateAsync({ rows: rows as never })
      setDryRunComplete(true)
      setResult(
        `Dry-run: ${report.validCount} valid, ${report.errors.length} errors, wroteData=${report.wroteData}`,
      )
      if (report.errors.length > 0) {
        toast.error(
          `Dry-run found ${report.errors.length} error(s). Fix them before commit.`,
        )
      } else {
        toast.success('Dry-run passed. You can commit the import.')
      }
    } catch (err) {
      toastActionError(err, 'Invalid rows / dry-run failed')
    }
  }

  async function handleCommit() {
    if (!requireWorkspace(companyId)) return
    if (!dryRunComplete) {
      toast.error('Run dry-run and fix errors before committing.')
      return
    }
    if (!requireTrimmed(jsonText, 'Import data')) return
    setResult(null)
    try {
      const rows = parseRows(jsonText)
      if (mode === 'parties') {
        if (
          !ledgerBySystemKey.customer_receivable ||
          !ledgerBySystemKey.supplier_payable
        ) {
          toast.error('Receivable and payable ledger mappings are required.')
          return
        }
        const report = await commitParties.mutateAsync({
          companyId,
          rows: rows as never,
          receivableAccountId: ledgerBySystemKey.customer_receivable,
          payableAccountId: ledgerBySystemKey.supplier_payable,
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.parties.list.queryKey({ companyId }),
        })
        setResult(
          `Committed ${report.createdCount} parties (${report.errors.length} errors)`,
        )
        toast.success(`Imported ${report.createdCount} parties.`)
      } else if (mode === 'stock') {
        const report = await commitStock.mutateAsync({
          companyId,
          rows: rows as never,
          occurredOn: new Date().toISOString().slice(0, 10),
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listItems.queryKey({ companyId }),
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listStockBalances.queryKey({ companyId }),
        })
        setResult(
          `Committed ${report.createdCount} opening stock rows (${report.errors.length} errors)`,
        )
        toast.success(`Imported ${report.createdCount} opening stock rows.`)
      } else if (mode === 'items') {
        const report = await commitItems.mutateAsync({
          companyId,
          rows: rows as never,
        })
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listItems.queryKey({ companyId }),
        })
        setResult(
          `Committed ${report.createdCount} items (${report.errors.length} errors)`,
        )
        toast.success(`Imported ${report.createdCount} items.`)
      } else {
        const report = await commitOpeningBalances.mutateAsync({
          companyId,
          entryDate: new Date().toISOString().slice(0, 10),
          rows: rows as never,
        })
        setResult(
          `Committed ${report.createdCount} opening balances (${report.errors.length} errors)`,
        )
        toast.success(`Imported ${report.createdCount} opening balances.`)
      }
      setDryRunComplete(false)
    } catch (err) {
      toastActionError(err, 'Commit failed')
    }
  }

  return (
    <WorkspacePage
      description="Dry-run then commit masters, stock, items, and opening balances."
      title="Import"
    >
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadIcon className="size-4 text-muted-foreground" />
              Opening import
            </CardTitle>
            <CardDescription>
              Validate first — commit only writes after a clean dry-run path
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              onValueChange={(value) => {
                const next = value as ImportMode
                setMode(next)
                setJsonText(sampleTextFor(next, format))
                setResult(null)
                setDryRunComplete(false)
              }}
              value={mode}
            >
              <TabsList>
                <TabsTrigger value="parties">Parties</TabsTrigger>
                <TabsTrigger value="stock">Opening stock</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="openingBalances">
                  Opening balances
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs
              onValueChange={(value) => {
                const next = value as 'json' | 'csv' | 'busy'
                setFormat(next)
                setJsonText(sampleTextFor(mode, next))
                setResult(null)
              }}
              value={format}
            >
              <TabsList>
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="csv">CSV</TabsTrigger>
                <TabsTrigger value="busy">BUSY/EZY</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="import-file">Import file</Label>
            <Input
              accept=".csv,.tsv,.txt,.json"
              id="import-file"
              onChange={handleFileUpload}
              type="file"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {format === 'busy'
                ? 'BUSY/EZY export'
                : format === 'csv'
                  ? 'CSV rows'
                  : 'JSON rows'}
            </Badge>
          </div>
          <Textarea
            className="min-h-48 font-mono text-xs"
            onChange={(event) => setJsonText(event.target.value)}
            value={jsonText}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDryRun} type="button" variant="outline">
              Dry-run
            </Button>
            <Button disabled={!companyId} onClick={handleCommit} type="button">
              Commit
            </Button>
            <Badge variant="outline">
              {format === 'busy'
                ? 'BUSY/EZY'
                : format === 'csv'
                  ? 'CSV'
                  : 'JSON'}
            </Badge>
          </div>
          {result ? (
            <p className="text-sm text-muted-foreground">{result}</p>
          ) : null}
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
