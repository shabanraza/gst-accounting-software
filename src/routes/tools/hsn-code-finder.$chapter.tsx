import { createFileRoute, notFound } from '@tanstack/react-router'

import { HsnChapterPage } from '#/features/tools/components/tool-pages.tsx'
import { getHsnChapter } from '#/features/tools/hsn-service.ts'
import { buildChapterPageHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/hsn-code-finder/$chapter')({
  loader: ({ params }) => {
    const chapter = getHsnChapter(params.chapter)
    if (!chapter) throw notFound()
    return chapter
  },
  head: ({ loaderData: chapter }) => (chapter ? buildChapterPageHead(chapter) : {}),
  component: HsnChapterRoute,
})

function HsnChapterRoute() {
  const chapter = Route.useLoaderData()
  return <HsnChapterPage chapter={chapter} />
}
