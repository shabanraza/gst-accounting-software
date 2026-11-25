import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { UpiQrCode } from '#/features/documents/components/upi-qr-code.tsx'

describe('UpiQrCode', () => {
  test('renders the UPI link as an SVG QR without any network call', () => {
    const markup = renderToStaticMarkup(
      <UpiQrCode value="upi://pay?pa=shop@okhdfc&pn=Shop&am=100.00&cu=INR&tn=INV-1" />,
    )

    expect(markup).toMatch(/^<svg[^>]+viewBox="0 0 (\d+) \1"/)
    expect(markup).toContain('<path d="M4 4h1v1h-1z')
    expect(markup).not.toMatch(/<image|href=/)
  })
})
