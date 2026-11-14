import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MailIcon, MessageCircleIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

type InvoiceShareActionsProps = {
  companyId: string
  invoiceId: string
  invoiceNumber: string
  companyName: string
  amount: string
}

export function InvoiceShareActions({
  companyId,
  invoiceId,
  invoiceNumber,
  companyName,
  amount,
}: InvoiceShareActionsProps) {
  const trpc = useTRPC()
  const [emailOpen, setEmailOpen] = React.useState(false)
  const [toEmail, setToEmail] = React.useState('')

  const emailInvoice = useMutation(trpc.sales.emailInvoice.mutationOptions())
  // Customer-facing link that opens without a login (signed, expires in 90 days).
  const shareLink = useQuery({
    ...trpc.sales.shareLink.queryOptions({ companyId, id: invoiceId }),
    staleTime: 60 * 60 * 1000,
  })

  const shareUrl =
    shareLink.data && typeof window !== 'undefined'
      ? `${window.location.origin}${shareLink.data.path}`
      : null
  const whatsappHref = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(
        `Invoice ${invoiceNumber} from ${companyName} for ${amount}. ${shareUrl}`,
      )}`
    : null

  async function handleSendEmail() {
    try {
      await emailInvoice.mutateAsync({
        companyId,
        id: invoiceId,
        toEmail: toEmail.trim(),
        companyName,
        amount,
      })
      toast.success(`Invoice emailed to ${toEmail.trim()}`)
      setEmailOpen(false)
      setToEmail('')
    } catch (err) {
      toast.error(getFormErrorMessage(err, 'Unable to send email'))
    }
  }

  return (
    <>
      {whatsappHref ? (
        <Button asChild type="button" variant="outline">
          <a href={whatsappHref} rel="noreferrer" target="_blank">
            <MessageCircleIcon data-icon="inline-start" />
            WhatsApp
          </a>
        </Button>
      ) : (
        <Button disabled type="button" variant="outline">
          <MessageCircleIcon data-icon="inline-start" />
          WhatsApp
        </Button>
      )}
      <Dialog onOpenChange={setEmailOpen} open={emailOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline">
            <MailIcon data-icon="inline-start" />
            Email
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email invoice {invoiceNumber}</DialogTitle>
            <DialogDescription>
              Send a summary and link to the customer.
            </DialogDescription>
          </DialogHeader>
          <Input
            onChange={(event) => setToEmail(event.target.value)}
            placeholder="customer@email.com"
            type="email"
            value={toEmail}
          />
          <DialogFooter>
            <Button
              disabled={!toEmail.trim() || emailInvoice.isPending}
              onClick={() => void handleSendEmail()}
              type="button"
            >
              {emailInvoice.isPending ? 'Sending…' : 'Send email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
