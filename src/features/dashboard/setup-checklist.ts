import type { SetupProgress } from '#/features/dashboard/dashboard-owner-service.ts'

export type SetupStepKey = 'company' | 'party' | 'item' | 'sale'

export type SetupStep = {
  key: SetupStepKey
  title: string
  detail: string
  to: string
  done: boolean
}

type CompanyAddress = {
  addressLine1: string
  city: string
  pincode: string
}

const filled = (value: string) => value.trim().length > 0

/**
 * First steps for a new company, each ticked from real records. The checklist
 * stays until the first sale is made, because that is when the books start.
 */
export function buildSetupChecklist(input: {
  company: CompanyAddress
  setup: SetupProgress
}) {
  const { company, setup } = input
  const steps: Array<SetupStep> = [
    {
      key: 'company',
      title: 'Complete your business details',
      detail: 'Address, city and PIN print on every invoice',
      to: '/app/masters/company-profile',
      done:
        filled(company.addressLine1) &&
        filled(company.city) &&
        filled(company.pincode),
    },
    {
      key: 'party',
      title: 'Add a customer or supplier',
      detail: 'With GSTIN and state for the right tax',
      to: '/app/masters/parties',
      done: setup.hasParty,
    },
    {
      key: 'item',
      title: 'Add an item',
      detail: 'HSN, GST rate and opening stock',
      to: '/app/masters/items',
      done: setup.hasItem,
    },
    {
      key: 'sale',
      title: 'Create your first sales invoice',
      detail: 'Posts to your books, stock and GST',
      to: '/app/sales/new',
      done: setup.hasSale,
    },
  ]

  return {
    steps,
    doneCount: steps.filter((step) => step.done).length,
    show: !setup.hasSale,
  }
}
