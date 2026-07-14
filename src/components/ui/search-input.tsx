import { SearchIcon } from 'lucide-react'

import { Input } from '#/components/ui/input.tsx'
import { cn } from '#/lib/utils.ts'

type SearchInputProps = React.ComponentProps<typeof Input> & {
  wrapperClassName?: string
}

export function SearchInput({
  className,
  wrapperClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 shrink-0 -translate-y-1/2 text-muted-foreground"
      />
      <Input className={cn('pl-9', className)} {...props} />
    </div>
  )
}
