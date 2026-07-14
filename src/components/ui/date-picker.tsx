import * as React from 'react'
import { CalendarIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Calendar } from '#/components/ui/calendar.tsx'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '#/components/ui/popover.tsx'
import {
  formatShortDate,
  localCalendarDate,
  parseCalendarDate,
} from '#/lib/calendar-date.ts'
import { cn } from '#/lib/utils.ts'

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  id?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
  className?: string
  max?: string
  min?: string
  variant?: 'field' | 'toolbar'
  align?: 'start' | 'center' | 'end'
  formatValue?: (value: string) => string
  size?: 'default' | 'sm' | 'lg'
}

function DatePicker({
  value,
  onChange,
  id,
  disabled,
  required,
  placeholder = 'Pick date',
  className,
  max,
  min,
  variant = 'field',
  align = 'start',
  formatValue = formatShortDate,
  size = 'default',
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const disabledDays = React.useMemo(() => {
    if (!max && !min) return undefined
    return (date: Date) => {
      const next = localCalendarDate(date)
      if (max && next > max) return true
      if (min && next < min) return true
      return false
    }
  }, [max, min])

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-required={required}
          className={cn(
            variant === 'field' && 'w-full justify-start font-normal',
            variant === 'toolbar' && 'h-8 min-h-8 justify-start',
            !value && 'text-muted-foreground',
            className,
          )}
          disabled={disabled}
          id={id}
          size={size}
          type="button"
          variant="outline"
        >
          <CalendarIcon data-icon="inline-start" />
          <span className="truncate">
            {value ? formatValue(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0">
        <Calendar
          defaultMonth={value ? parseCalendarDate(value) : undefined}
          disabled={disabledDays}
          mode="single"
          onSelect={(date) => {
            if (!date) return
            onChange(localCalendarDate(date))
            setOpen(false)
          }}
          selected={value ? parseCalendarDate(value) : undefined}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
