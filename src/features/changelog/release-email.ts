import {
  RELEASE_HEADING,
  SECTION_LABELS,
} from '#/features/changelog/changelog.ts'
import { escapeHtml } from '#/lib/email.ts'

export type ReleaseNotes = {
  version: string
  date: string | null
  markdown: string
}

const CHANGELOG_URL = 'https://hisaabkro.in/changelog'

/** Every dated release in a Keep a Changelog file, newest first. */
function listReleases(changelog: string): Array<ReleaseNotes> {
  const releases: Array<{ version: string; date: string; lines: Array<string> }> =
    []
  let current: (typeof releases)[number] | null = null

  for (const line of changelog.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      const match = RELEASE_HEADING.exec(line)
      current = match ? { version: match[1], date: match[2], lines: [] } : null
      if (current) releases.push(current)
      continue
    }
    current?.lines.push(line)
  }

  return releases.map(({ lines, ...release }) => ({
    ...release,
    markdown: lines.join('\n').trim(),
  }))
}

/** The notes for one version (a tag like `v0.3.0` works too). */
export function findRelease(
  changelog: string,
  version: string,
): ReleaseNotes | null {
  const wanted = version.replace(/^v/, '')
  return (
    listReleases(changelog).find((release) => release.version === wanted) ??
    null
  )
}

/** Releases dated in a `YYYY-MM` month, for a monthly digest. */
export function releasesInMonth(
  changelog: string,
  month: string,
): Array<ReleaseNotes> {
  return listReleases(changelog).filter((release) =>
    release.date?.startsWith(`${month}-`),
  )
}

const style = {
  h2: 'margin:24px 0 8px;font-size:16px',
  h3: 'margin:16px 0 6px;font-size:14px;color:#0f766e',
  p: 'margin:0 0 12px',
  ul: 'margin:0 0 12px;padding-left:20px',
  li: 'margin:0 0 6px',
  code: 'font-family:monospace;background:#f4f4f5;padding:1px 4px;border-radius:4px',
  a: 'color:#0f766e',
}

function inline(text: string) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, `<code style="${style.code}">$1</code>`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label, url: string) =>
      /^https?:\/\//.test(url)
        ? `<a href="${url}" style="${style.a}">${label}</a>`
        : label,
    )
}

/** Markdown subset used in release notes: headings, bullets, paragraphs. */
function markdownToHtml(markdown: string) {
  const html: Array<string> = []
  let items: Array<string> = []
  let paragraph: Array<string> = []

  const flush = () => {
    if (items.length > 0) {
      html.push(
        `<ul style="${style.ul}">${items
          .map((item) => `<li style="${style.li}">${inline(item)}</li>`)
          .join('')}</ul>`,
      )
      items = []
    }
    if (paragraph.length > 0) {
      html.push(`<p style="${style.p}">${inline(paragraph.join(' '))}</p>`)
      paragraph = []
    }
  }

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim()
    const heading = /^#{1,6}\s+(.*)$/.exec(line)
    const bullet = /^[-*]\s+(.*)$/.exec(line)

    if (heading) {
      flush()
      const title = SECTION_LABELS[heading[1].trim()] ?? heading[1].trim()
      html.push(`<h3 style="${style.h3}">${inline(title)}</h3>`)
    } else if (bullet) {
      if (paragraph.length > 0) flush()
      items.push(bullet[1])
    } else if (line === '') {
      flush()
    } else {
      if (items.length > 0) flush()
      paragraph.push(line)
    }
  }
  flush()

  return html.join('\n')
}

const monthName = new Intl.DateTimeFormat('en-IN', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Email for a Resend Broadcast. One release, or several for a monthly digest.
 * The footer carries Resend's unsubscribe placeholder, which Resend replaces
 * per contact and also uses for the List-Unsubscribe header.
 */
export function buildReleaseEmail(
  releases: Array<ReleaseNotes>,
  options: { month?: string } = {},
) {
  const digest = options.month !== undefined
  const subject = digest
    ? `HisaabKro updates for ${monthName.format(new Date(`${options.month}-01T00:00:00Z`))}`
    : `What’s new in HisaabKro ${releases[0]?.version ?? ''}`.trim()

  const body = releases
    .map((release) =>
      digest
        ? `<h2 style="${style.h2}">Version ${escapeHtml(release.version)}</h2>\n${markdownToHtml(release.markdown)}`
        : markdownToHtml(release.markdown),
    )
    .join('\n')

  const html = `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;font-size:14px;line-height:1.6">
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(subject)}</h1>
${body}
<p style="margin:24px 0 0"><a href="${CHANGELOG_URL}" style="${style.a}">See all updates</a></p>
<p style="margin:24px 0 0;font-size:12px;color:#888">You get this because you turned on product updates in HisaabKro settings. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#888">Unsubscribe</a></p>
</div>`

  return { subject, html }
}

/**
 * Body for Resend's create-broadcast API. Without `sendAt` (or with "draft")
 * the broadcast stays a draft; otherwise Resend sends it at that time, e.g.
 * "in 1 hour", and it can be cancelled in Resend until then.
 */
export function buildBroadcastRequest(input: {
  segmentId: string
  from: string
  name: string
  email: { subject: string; html: string }
  sendAt?: string
}) {
  const sendAt = input.sendAt?.trim()
  return {
    segment_id: input.segmentId,
    from: input.from,
    reply_to: 'support@hisaabkro.in',
    subject: input.email.subject,
    html: input.email.html,
    name: input.name,
    ...(sendAt && sendAt !== 'draft' ? { send: true, scheduled_at: sendAt } : {}),
  }
}
