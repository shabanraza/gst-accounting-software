import * as React from 'react'
import { create } from 'qrcode/lib/core/qrcode.js'

import { cn } from '#/lib/utils.ts'

const QUIET_ZONE = 4

/** Locally generated QR (no external service) drawn as a single SVG path. */
export function UpiQrCode({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const { size, path } = React.useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' })
    let d = ''
    for (let row = 0; row < modules.size; row += 1) {
      for (let col = 0; col < modules.size; col += 1) {
        if (modules.get(row, col)) {
          d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`
        }
      }
    }
    return { size: modules.size + QUIET_ZONE * 2, path: d }
  }, [value])

  return (
    <svg
      aria-label="UPI payment QR code"
      className={cn('bg-white', className)}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#fff" height={size} width={size} />
      <path d={path} fill="#000" />
    </svg>
  )
}
