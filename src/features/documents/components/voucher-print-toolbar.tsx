import { DownloadIcon, ExternalLinkIcon, PrinterIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'

type VoucherPrintToolbarProps = {
  fullPageHref: string
  pdfHref: string
  onPrint?: () => void
  className?: string
}

export function VoucherPrintToolbar({
  fullPageHref,
  pdfHref,
  onPrint,
  className,
}: VoucherPrintToolbarProps) {
  function handlePrint() {
    if (onPrint) {
      onPrint()
      return
    }
    window.print()
  }

  function handleDownloadPdf() {
    const popup = window.open(pdfHref, '_blank', 'noopener,noreferrer')
    if (!popup) return
    popup.addEventListener('load', () => {
      popup.focus()
      popup.print()
    })
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 print:hidden ${className ?? ''}`}>
      <Button onClick={handlePrint} type="button" variant="default">
        <PrinterIcon data-icon="inline-start" />
        Print
      </Button>
      <Button onClick={handleDownloadPdf} type="button" variant="outline">
        <DownloadIcon data-icon="inline-start" />
        Download PDF
      </Button>
      <Button asChild type="button" variant="outline">
        <a href={fullPageHref} rel="noreferrer" target="_blank">
          <ExternalLinkIcon data-icon="inline-start" />
          Open full page
        </a>
      </Button>
    </div>
  )
}
