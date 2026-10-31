import type * as React from 'react'

import { cn } from '#/lib/utils.ts'

import type { Screenshot } from '#/features/marketing/landing-content.ts'

/** Every screenshot ships with an 800 px wide copy for phones. */
export function smallScreenshotSrc(src: string) {
  return src.replace(/\.webp$/, '-800.webp')
}

/** A light browser frame around an app screen. */
export function AppFrame({
  children,
  className,
  path = '/app',
  ...props
}: React.ComponentProps<'figure'> & { path?: string }) {
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-(--elevation-2)',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden="true"
        className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2"
      >
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 truncate text-xs text-muted-foreground">
          hisaabkro.in{path}
        </span>
      </div>
      {children}
    </figure>
  )
}

/** A real app screen inside a light browser frame. */
export function AppScreenshot({
  className,
  priority = false,
  shot,
  sizes = '(min-width: 1024px) 1024px, 100vw',
}: {
  className?: string
  /** The hero image is the largest paint, so it loads first and eagerly. */
  priority?: boolean
  shot: Screenshot
  sizes?: string
}) {
  return (
    <AppFrame className={className}>
      <img
        alt={shot.alt}
        className="block h-auto w-full"
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        height={shot.height}
        loading={priority ? 'eager' : 'lazy'}
        sizes={sizes}
        src={shot.src}
        srcSet={`${smallScreenshotSrc(shot.src)} 800w, ${shot.src} ${shot.width}w`}
        width={shot.width}
      />
    </AppFrame>
  )
}
