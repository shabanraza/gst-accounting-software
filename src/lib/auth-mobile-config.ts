export const MOBILE_AUTH_SCHEME = 'gstbooks'

export function getMobileAuthScheme() {
  return MOBILE_AUTH_SCHEME
}

export function getMobileTrustedOrigins() {
  return [
    `${MOBILE_AUTH_SCHEME}://`,
    'exp://',
    'http://localhost:8081',
    'http://10.0.2.2:8081',
  ]
}

export function mergeTrustedOrigins(
  baseOrigins: Array<string>,
  extraOrigins: Array<string>,
) {
  return [...new Set([...baseOrigins, ...extraOrigins])]
}
