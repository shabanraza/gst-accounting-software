import { indianStates } from '#/features/app-shell/data/india-masters.ts'

// Older spellings still common in Tally and BUSY masters.
const STATE_ALIASES: Record<string, string> = {
  orissa: '21',
  pondicherry: '34',
  'new delhi': '07',
  'nct of delhi': '07',
}

const STATE_CODE_BY_NAME = new Map<string, string>([
  ...indianStates.map((state) => [state.name.toLowerCase(), state.code] as const),
  ...Object.entries(STATE_ALIASES),
])

/**
 * GST state code for an imported party: the GSTIN prefix wins, then a two
 * digit code or state name, then the company's own state.
 */
export function resolveImportStateCode(
  rawState: string,
  gstin: string,
  fallback: string,
): string {
  const fromGstin = gstin.trim().slice(0, 2)
  if (/^\d{2}$/.test(fromGstin)) return fromGstin

  const state = rawState.trim()
  if (/^\d{2}$/.test(state)) return state

  return STATE_CODE_BY_NAME.get(state.toLowerCase().replace(/\s+/g, ' ')) ?? fallback
}
