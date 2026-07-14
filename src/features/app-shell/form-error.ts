import { TRPCClientError } from '@trpc/client'
import { toast } from 'sonner'

const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

const MESSAGE_RULES: Array<{ test: RegExp; message: string }> = [
  {
    test: /e-way bill already exists/i,
    message: 'An e-way bill is already generated for this invoice.',
  },
  {
    test: /e-invoice already exists/i,
    message: 'An e-invoice is already generated for this invoice.',
  },
  {
    test: /supplier bill number already exists|DuplicateSupplierBill/i,
    message: 'This supplier bill number is already recorded.',
  },
  {
    test: /invoice already cancelled/i,
    message: 'This invoice is already cancelled.',
  },
  {
    test: /InsufficientStock|insufficient stock/i,
    message: 'Insufficient stock for one or more items.',
  },
  {
    test: /DuplicateGodownName|godown name already exists/i,
    message: 'A godown with this name already exists.',
  },
  {
    test: /GodownInUse|godown is in use/i,
    message:
      'This godown cannot be deleted because stock movements reference it.',
  },
  {
    test: /CannotDeleteDefaultGodown/i,
    message: 'The default godown cannot be deleted.',
  },
  {
    test: /CannotDeleteLastGodown/i,
    message: 'At least one godown must remain.',
  },
  {
    test: /GodownNotFound/i,
    message: 'Godown not found.',
  },
  {
    test: /DuplicatePartyName/i,
    message: 'A party with this name already exists.',
  },
  {
    test: /PartyNotFound/i,
    message: 'Party not found.',
  },
  {
    test: /DuplicateCompanyGstin/i,
    message: 'A company with this GSTIN already exists.',
  },
  {
    test: /LedgerAccountNotFound/i,
    message: 'One or more ledger accounts could not be found.',
  },
  {
    test: /InsufficientRole|FORBIDDEN|permission denied/i,
    message: 'You do not have permission to perform this action.',
  },
  {
    test: /Invitation not found/i,
    message: 'This invitation is invalid or has expired.',
  },
  {
    test: /PaymentAllocationError|Receipt amount must be greater than zero|Payment amount must be greater than zero|exceeds bill outstanding|exceeds invoice outstanding/i,
    message: 'Payment amount is invalid or exceeds the document balance.',
  },
  {
    test: /UnbalancedLedgerEntry|debits must equal credits/i,
    message: 'Journal entry is not balanced. Total debits must equal total credits.',
  },
  {
    test: /UNAUTHORIZED|unauthorized/i,
    message: 'Please sign in to continue.',
  },
]

function extractRawMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return ''
}

function parseZodIssues(message: string): string | null {
  if (!message.startsWith('[')) {
    return null
  }

  try {
    const parsed = JSON.parse(message) as Array<{
      message?: string
      path?: Array<string | number>
    }>
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null
    }

    const fieldLabels: Record<string, string> = {
      customerStateCode: 'Customer state',
      supplierStateCode: 'Supplier state',
      companyStateCode: 'Company state',
      placeOfSupply: 'Place of supply',
      stateCode: 'State',
      legalName: 'Legal name',
      tradeName: 'Trade name',
      name: 'Name',
      email: 'Email',
      amount: 'Amount',
      narration: 'Narration',
      customerId: 'Customer',
      supplierId: 'Supplier',
      invoiceId: 'Invoice',
      purchaseBillId: 'Purchase bill',
      supplierBillNumber: 'Supplier bill number',
      hsnCode: 'HSN code',
      quantity: 'Quantity',
      rate: 'Rate',
    }

    return parsed
      .map((issue) => {
        const field = issue.path?.[0]
        const label =
          typeof field === 'string' ? (fieldLabels[field] ?? field) : ''
        const issueMessage = issue.message ?? 'Invalid value'

        if (
          label &&
          /too small|expected string to have|invalid input|required/i.test(
            issueMessage,
          )
        ) {
          if (
            field === 'customerStateCode' ||
            field === 'supplierStateCode' ||
            field === 'placeOfSupply' ||
            field === 'companyStateCode' ||
            field === 'stateCode'
          ) {
            return `${label} must be a valid 2-digit Indian state code.`
          }
          if (field === 'email') {
            return 'Enter a valid email address.'
          }
          return `${label} is required.`
        }

        const path =
          issue.path && issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
        return `${path}${issueMessage}`
      })
      .join('; ')
  } catch {
    return null
  }
}

function mapToFriendlyMessage(rawMessage: string): string | null {
  for (const rule of MESSAGE_RULES) {
    if (rule.test.test(rawMessage)) {
      return rule.message
    }
  }
  return null
}

function sanitizeMessage(message: string): string {
  return message
    .replace(/^TRPCClientError:\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .replace(UUID_PATTERN, '')
    .replace(/\s+for sales invoice:\s*\.?/gi, '.')
    .replace(/\s+for invoice:\s*\.?/gi, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/:\s*\.?$/, '.')
    .trim()
}

function looksLikeInternalError(message: string): boolean {
  if (!message) {
    return true
  }
  if (UUID_PATTERN.test(message)) {
    return true
  }
  if (/^[A-Z][A-Za-z]+Error(?::|\s|$)/.test(message)) {
    return true
  }
  if (/\/src\/|\.ts:\d+|at\s+\w+/.test(message)) {
    return true
  }
  if (message.length > 200) {
    return true
  }
  return false
}

/** Extract a user-safe message from tRPC / Zod / Error failures. */
export function getFormErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  const raw = extractRawMessage(error).trim()
  if (!raw) {
    return fallback
  }

  const zodMessage = parseZodIssues(raw)
  if (zodMessage) {
    return zodMessage
  }

  const friendly = mapToFriendlyMessage(raw)
  if (friendly) {
    return friendly
  }

  const sanitized = sanitizeMessage(raw)
  if (looksLikeInternalError(sanitized)) {
    return fallback
  }

  return sanitized || fallback
}

/** Show a toast for action failures without leaking backend details. */
export function toastActionError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  toast.error(getFormErrorMessage(error, fallback))
}
