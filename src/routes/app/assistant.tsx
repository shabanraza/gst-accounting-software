import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { AssistantChatPage } from '#/features/assistant/components/assistant-chat-page.tsx'

const searchSchema = z.object({
  q: z.string().max(500).optional().catch(undefined),
})

export const Route = createFileRoute('/app/assistant')({
  validateSearch: searchSchema,
  component: AssistantRoute,
})

function AssistantRoute() {
  const { q } = Route.useSearch()
  return <AssistantChatPage initialQuestion={q} />
}
