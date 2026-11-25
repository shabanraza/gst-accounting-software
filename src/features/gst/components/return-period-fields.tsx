import { DatePicker } from '#/components/ui/date-picker.tsx'
import { Label } from '#/components/ui/label.tsx'

export function ReturnPeriodFields({
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
}: {
  periodStart: string
  periodEnd: string
  onPeriodStartChange: (value: string) => void
  onPeriodEndChange: (value: string) => void
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label>Period start</Label>
        <DatePicker
          onChange={onPeriodStartChange}
          value={periodStart}
          variant="toolbar"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Period end</Label>
        <DatePicker
          onChange={onPeriodEndChange}
          value={periodEnd}
          variant="toolbar"
        />
      </div>
    </>
  )
}
