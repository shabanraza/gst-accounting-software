import { escapeHtml } from '#/lib/email.ts'

export const SUPPORT_EMAIL = 'support@hisaabkro.in'

export type ProblemReportInput = {
  description: string
  route: string
  appVersion: string
  userAgent: string
  reporter: { name: string; email: string }
}

/** Query strings and hashes can carry filters or tokens; keep the path only. */
function routePath(route: string) {
  return route.split(/[?#]/)[0] || '/'
}

function subjectLine(description: string) {
  const firstLine = description.trim().split(/\r?\n/)[0] ?? ''
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine
}

export function buildProblemReportEmail(input: ProblemReportInput) {
  const rows: Array<[string, string]> = [
    ['From', `${input.reporter.name} <${input.reporter.email}>`],
    ['Page', routePath(input.route)],
    ['App version', input.appVersion],
    ['Browser', input.userAgent],
  ]

  return {
    to: SUPPORT_EMAIL,
    replyTo: input.reporter.email,
    subject: `Problem report (v${input.appVersion}): ${subjectLine(input.description)}`,
    html: `
      <div style="font-family:Inter,system-ui,sans-serif;max-width:600px;color:#111">
        <h2 style="margin:0 0 12px;font-size:18px">Problem report</h2>
        <p style="font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(input.description)}</p>
        <table style="font-size:13px;color:#444;border-collapse:collapse">
          ${rows
            .map(
              ([label, value]) =>
                `<tr><td style="padding:2px 12px 2px 0;color:#888">${label}</td><td>${escapeHtml(value)}</td></tr>`,
            )
            .join('')}
        </table>
      </div>
    `,
  }
}
