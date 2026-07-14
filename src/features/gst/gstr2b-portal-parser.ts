import type { Gstr2bRow } from '#/features/gst/gstr2b-reconciliation-service.ts'

function normalizeInvoiceNumber(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function normalizeGstin(value: string) {
  return value.trim().toUpperCase()
}

function normalizePortalDate(value: string) {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const [, day, month, year] = dmy
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return trimmed
}

function money(value: unknown): string {
  if (typeof value === 'number') return Math.abs(value).toFixed(2)
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/,/g, ''))
    if (Number.isFinite(parsed)) return Math.abs(parsed).toFixed(2)
  }
  return '0.00'
}

function sumTaxComponents(row: Record<string, unknown>) {
  const cgst = money(row.cgstAmount ?? row.camt ?? row.cgst ?? 0)
  const sgst = money(row.sgstAmount ?? row.samt ?? row.sgst ?? 0)
  const igst = money(row.igstAmount ?? row.iamt ?? row.igst ?? 0)
  const totalGst = money(
    row.totalGstAmount ??
      row.gstAmount ??
      Number(cgst) + Number(sgst) + Number(igst),
  )
  return { cgstAmount: cgst, sgstAmount: sgst, igstAmount: igst, totalGstAmount: totalGst }
}

function mapPortalRow(
  supplierGstin: string,
  row: Record<string, unknown>,
): Gstr2bRow | null {
  const supplierInvoiceNumber = String(
    row.supplierInvoiceNumber ?? row.inum ?? row.invoiceNumber ?? '',
  ).trim()
  const invoiceDate = normalizePortalDate(
    String(row.invoiceDate ?? row.idt ?? row.dt ?? ''),
  )
  if (!supplierInvoiceNumber || !invoiceDate) return null

  const taxes = sumTaxComponents(row)
  const taxableAmount = money(
    row.taxableAmount ?? row.txval ?? row.val ?? row.taxable_value ?? 0,
  )

  return {
    supplierGstin: normalizeGstin(supplierGstin || String(row.supplierGstin ?? row.ctin ?? '')),
    supplierInvoiceNumber: normalizeInvoiceNumber(supplierInvoiceNumber),
    invoiceDate,
    taxableAmount,
    cgstAmount: taxes.cgstAmount,
    sgstAmount: taxes.sgstAmount,
    igstAmount: taxes.igstAmount,
    totalGstAmount: taxes.totalGstAmount,
  }
}

function extractB2bGroups(parsed: unknown): Array<Record<string, unknown>> {
  if (!parsed || typeof parsed !== 'object') return []

  const root = parsed as Record<string, unknown>
  const candidates = [
    root.b2b,
    (root.data as Record<string, unknown> | undefined)?.b2b,
    (root.docdata as Record<string, unknown> | undefined)?.b2b,
    (root.data as Record<string, unknown> | undefined)?.docdata &&
      ((root.data as Record<string, unknown>).docdata as Record<string, unknown>)
        .b2b,
    root.rows,
  ]

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as Array<Record<string, unknown>>
    }
  }

  return []
}

export function parseGstr2bPortalJson(text: string): Array<Gstr2bRow> {
  const parsed = JSON.parse(text) as unknown
  const rows: Array<Gstr2bRow> = []

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue
      const mapped = mapPortalRow(
        String((entry as Record<string, unknown>).supplierGstin ?? ''),
        entry as Record<string, unknown>,
      )
      if (mapped) rows.push(mapped)
    }
    if (rows.length > 0) return rows
  }

  const b2bGroups = extractB2bGroups(parsed)
  for (const group of b2bGroups) {
    const supplierGstin = String(group.ctin ?? group.gstin ?? group.supplierGstin ?? '')
    const invoices = Array.isArray(group.inv)
      ? group.inv
      : Array.isArray(group.invoices)
        ? group.invoices
        : []

    for (const invoice of invoices) {
      if (!invoice || typeof invoice !== 'object') continue
      const mapped = mapPortalRow(supplierGstin, invoice as Record<string, unknown>)
      if (mapped) rows.push(mapped)
    }

    if (invoices.length === 0) {
      const mapped = mapPortalRow(supplierGstin, group)
      if (mapped) rows.push(mapped)
    }
  }

  if (rows.length === 0) {
    throw new Error(
      'Could not find GSTR-2B rows. Paste a JSON array or portal export with b2b invoices.',
    )
  }

  return rows
}
