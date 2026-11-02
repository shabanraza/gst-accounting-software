import { encodeEan13 } from '#/features/inventory/barcode.ts'

/** Quiet zones either side, in modules, per the EAN-13 spec. */
const QUIET_LEFT = 11
const QUIET_RIGHT = 7
const BAR_HEIGHT = 50
const TEXT_HEIGHT = 10

/** A scannable EAN-13 as SVG; black on white so it prints cleanly. */
export function Ean13Barcode({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  const modules = encodeEan13(code)
  const width = QUIET_LEFT + modules.length + QUIET_RIGHT
  const bars: Array<{ x: number; width: number }> = []
  for (let index = 0; index < modules.length; index++) {
    if (modules[index] !== '1') continue
    const last = bars.at(-1)
    if (last && last.x + last.width === QUIET_LEFT + index) {
      last.width += 1
    } else {
      bars.push({ x: QUIET_LEFT + index, width: 1 })
    }
  }

  return (
    <svg
      aria-label={`Barcode ${code}`}
      className={className}
      role="img"
      shapeRendering="crispEdges"
      viewBox={`0 0 ${width} ${BAR_HEIGHT + TEXT_HEIGHT}`}
    >
      <rect fill="#fff" height={BAR_HEIGHT + TEXT_HEIGHT} width={width} />
      {bars.map((bar) => (
        <rect
          fill="#000"
          height={BAR_HEIGHT}
          key={bar.x}
          width={bar.width}
          x={bar.x}
        />
      ))}
      <text
        fill="#000"
        fontFamily="monospace"
        fontSize={TEXT_HEIGHT - 1}
        textAnchor="middle"
        textLength={modules.length}
        x={QUIET_LEFT + modules.length / 2}
        y={BAR_HEIGHT + TEXT_HEIGHT - 1}
      >
        {code}
      </text>
    </svg>
  )
}
