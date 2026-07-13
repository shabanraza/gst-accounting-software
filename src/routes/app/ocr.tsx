import { createFileRoute } from '@tanstack/react-router'

import { OcrReviewPanel } from '#/features/ocr/components/ocr-review-panel.tsx'

export const Route = createFileRoute('/app/ocr')({
  component: OcrRoute,
})

function OcrRoute() {
  return <OcrReviewPanel />
}
