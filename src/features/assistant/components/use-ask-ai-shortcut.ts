import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'

import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'

/** Alt+A opens the Ask AI chat for members who can view reports. */
export function useAskAiShortcut() {
  const navigate = useNavigate()
  const { capabilities } = useWorkspace()
  const allowed = capabilities.includes('view_reports')

  React.useEffect(() => {
    if (!allowed) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === 'KeyA' &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault()
        void navigate({ to: '/app/assistant' })
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [allowed, navigate])
}
