import { createFileRoute, notFound } from '@tanstack/react-router'

import { HsnChapterPage } from '#/features/tools/components/tool-pages.tsx'
import { getHsnChapter } from '#/features/tools/hsn-service.ts'
import { buildChapterPageHead } from '#/features/tools/tool-head.ts'

export const Route = createFileRoute('/tools/hsn-code-finder/$chapter')({
  loader: async ({ params }) => {
    const chapter = getHsnChapter(params.chapter)
    if (!chapter) throw notFound()
    // Imported here so the code data and its loader stay out of the main bundle.
    const { loadChapterRows } = await import('#/features/tools/hsn-data-loader.ts')
    return { chapter, rows: await loadChapterRows(chapter.code) }
  },
  head: ({ loaderData }) => (loaderData ? buildChapterPageHead(loaderData.chapter) : {}),
  component: HsnChapterRoute,
})

function HsnChapterRoute() {
  const { chapter, rows } = Route.useLoaderData()
  return <HsnChapterPage chapter={chapter} rows={rows} />
}
