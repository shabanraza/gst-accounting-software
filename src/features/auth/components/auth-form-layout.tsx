import type { FormEvent, ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

export function AuthPage({
  title,
  description,
  children,
  maxWidth = 'md',
}: {
  title: string
  description: string
  children: ReactNode
  maxWidth?: 'md' | 'lg'
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground">
      <Card
        className={maxWidth === 'lg' ? 'w-full max-w-lg' : 'w-full max-w-md'}
        size="sm"
      >
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children}
      </Card>
    </div>
  )
}

export function AuthForm({
  onSubmit,
  children,
}: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  return (
    <form className="contents" onSubmit={onSubmit}>
      <CardContent className="flex flex-col gap-3 [&_[data-slot=input]]:h-11 [&_[data-slot=input]]:text-base sm:[&_[data-slot=input]]:text-sm [&_button]:min-h-11">
        {children}
      </CardContent>
    </form>
  )
}

export function AuthFieldGroup({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <label className="text-xs font-medium" htmlFor={htmlFor}>
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  )
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

export function AuthFooterText({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs text-muted-foreground">{children}</p>
}
