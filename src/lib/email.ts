type SendEmailInput = {
  to: string
  subject: string
  html: string
}

/**
 * Sends transactional email via Resend's REST API (free tier).
 * When `RESEND_API_KEY` is not set (local dev), it logs the message and any
 * action link to the console so flows remain testable without a provider.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'ClothBooks <onboarding@resend.dev>'

  if (!apiKey) {
    console.info(`[email:stub] To: ${input.to} · Subject: ${input.subject}`)
    console.info(input.html)
    return
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`[email] send failed (${response.status}): ${body}`)
  }
}

function emailShell(
  title: string,
  bodyHtml: string,
  cta?: { label: string; url: string },
) {
  return `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      <div style="font-size:14px;line-height:1.6;color:#444">${bodyHtml}</div>
      ${
        cta
          ? `<a href="${cta.url}" style="display:inline-block;margin-top:20px;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-size:14px">${cta.label}</a>
             <p style="font-size:12px;color:#888;margin-top:16px;word-break:break-all">${cta.url}</p>`
          : ''
      }
    </div>
  `
}

export async function sendVerificationEmail(input: {
  to: string
  url: string
}) {
  await sendEmail({
    to: input.to,
    subject: 'Verify your ClothBooks email',
    html: emailShell(
      'Confirm your email',
      'Confirm your email address to secure your ClothBooks account.',
      { label: 'Verify email', url: input.url },
    ),
  })
}

export async function sendPasswordResetEmail(input: {
  to: string
  url: string
}) {
  await sendEmail({
    to: input.to,
    subject: 'Reset your ClothBooks password',
    html: emailShell(
      'Reset your password',
      'We received a request to reset your password. This link expires in 1 hour. If you did not request this, ignore this email.',
      { label: 'Reset password', url: input.url },
    ),
  })
}

export async function sendInvoiceEmail(input: {
  to: string
  companyName: string
  invoiceNumber: string
  invoiceDate: string
  amount: string
  url?: string
}) {
  await sendEmail({
    to: input.to,
    subject: `Invoice ${input.invoiceNumber} from ${input.companyName}`,
    html: emailShell(
      `Invoice ${input.invoiceNumber}`,
      `${input.companyName} has shared invoice <strong>${input.invoiceNumber}</strong> dated ${input.invoiceDate} for <strong>${input.amount}</strong>. Thank you for your business.`,
      input.url ? { label: 'View invoice', url: input.url } : undefined,
    ),
  })
}

export async function sendInvitationEmail(input: {
  to: string
  url: string
  companyName: string
  role: string
}) {
  await sendEmail({
    to: input.to,
    subject: `You're invited to ${input.companyName} on ClothBooks`,
    html: emailShell(
      `Join ${input.companyName}`,
      `You have been invited as <strong>${input.role}</strong>. Accept the invite to access the company books.`,
      { label: 'Accept invite', url: input.url },
    ),
  })
}
