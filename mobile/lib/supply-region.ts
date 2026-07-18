import type { SupplyRegion } from '@/lib/sales-invoice-form'

export function inferSupplyRegion(
  partyStateCode: string,
  companyStateCode: string,
): SupplyRegion {
  return partyStateCode === companyStateCode ? 'local' : 'central'
}

export function supplyRegionLabel(region: SupplyRegion) {
  return region === 'local' ? 'Local (CGST+SGST)' : 'IGST'
}
