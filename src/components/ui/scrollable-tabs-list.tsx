import type { ComponentProps } from 'react'

import { TabsList } from '#/components/ui/tabs.tsx'
import { cn } from '#/lib/utils.ts'

/** Horizontal scroll wrapper for tab bars on narrow screens. */
export function ScrollableTabsList({
  className,
  ...props
}: ComponentProps<typeof TabsList>) {
  return (
    <div
      className="max-w-full overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-slot="scrollable-tabs-list"
    >
      <TabsList className={cn('w-max min-w-0', className)} {...props} />
    </div>
  )
}
