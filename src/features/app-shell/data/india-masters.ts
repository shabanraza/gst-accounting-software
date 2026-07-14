/** Shared India GST / BUSY-style master lists for create forms. */

export const indianStates = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
] as const

export const gstRateOptions = [
  '0.00',
  '5.00',
  '12.00',
  '18.00',
  '28.00',
] as const

export const itemGroups = [
  'Fabrics',
  'Yarn',
  'Finished goods',
  'Packaging',
  'Services',
  'General',
] as const

export const unitOptions = [
  { label: 'Meter', uqc: 'MTR' },
  { label: 'Nos', uqc: 'NOS' },
  { label: 'Kilogram', uqc: 'KGS' },
  { label: 'Piece', uqc: 'PCS' },
  { label: 'Box', uqc: 'BOX' },
  { label: 'Set', uqc: 'SET' },
  { label: 'Thaan', uqc: 'MTR' },
  { label: 'Job', uqc: 'NOS' },
] as const

export const paymentTermsOptions = [
  { days: 0, label: 'Immediate / Cash' },
  { days: 7, label: '7 days' },
  { days: 15, label: '15 days' },
  { days: 30, label: '30 days' },
  { days: 45, label: '45 days' },
  { days: 60, label: '60 days' },
] as const

export const salesSeriesOptions = ['INV', 'TAX', 'RET'] as const
export const purchaseSeriesOptions = ['PUR', 'EXP', 'IMP'] as const

export function stateLabel(code: string) {
  const match = indianStates.find((state) => state.code === code)
  return match ? `${match.name} (${match.code})` : code
}

export function uqcForUnit(unitLabel: string) {
  return unitOptions.find((unit) => unit.label === unitLabel)?.uqc ?? 'NOS'
}
