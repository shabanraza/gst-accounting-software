type PartyAddressFields = {
  addressLine1?: string
  addressLine2?: string
  city?: string
  pincode?: string
  billingAddress?: string
  shippingAddress?: string
}

export function formatPartyStructuredAddress(
  fields: PartyAddressFields,
): string {
  const cityLine = [fields.city?.trim(), fields.pincode?.trim()]
    .filter(Boolean)
    .join(' - ')
  return [fields.addressLine1, fields.addressLine2, cityLine]
    .map((line) => line?.trim())
    .filter((line): line is string => Boolean(line))
    .join('\n')
}

export function resolvePartyBillingAddress(fields: PartyAddressFields): string {
  const explicit = fields.billingAddress?.trim()
  if (explicit) return explicit
  return formatPartyStructuredAddress(fields)
}

export function resolvePartyShippingAddress(
  fields: PartyAddressFields,
): string {
  const explicit = fields.shippingAddress?.trim()
  if (explicit) return explicit
  return resolvePartyBillingAddress(fields)
}
