import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
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
  printPath: string
}

export function InvoiceShareActions({
  companyId,
  invoiceId,
  invoiceNumber,
  companyName,
  amount,
  printPath,
}: InvoiceShareActionsProps) {
  const trpc = useTRPC()
  const [emailOpen, setEmailOpen] = React.useState(false)
  const [toEmail, setToEmail] = React.useState('')

  const emailInvoice = useMutation(trpc.sales.emailInvoice.mutationOptions())

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${printPath}` : ''
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Invoice ${invoiceNumber} from ${companyName} for ${amount}. ${shareUrl}`,
  )}`

  async function handleSendEmail() {
    try {
      await emailInvoice.mutateAsync({
        companyId,
        id: invoiceId,
        toEmail: toEmail.trim(),
        companyName,
        amount,
        url: shareUrl || undefined,
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
      <Button asChild type="button" variant="outline">
        <a href={whatsappHref} rel="noreferrer" target="_blank">
          <MessageCircleIcon data-icon="inline-start" />
          WhatsApp
        </a>
      </Button>
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
