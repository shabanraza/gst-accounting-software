#!/usr/bin/env bun
/**
 * Creates a DRAFT Resend Broadcast of release notes for the product-updates
 * audience. It never sends: the owner reviews and sends it in Resend.
 *
 *   bun scripts/create-release-broadcast.ts --version v0.3.0
 *   bun scripts/create-release-broadcast.ts --month 2026-11
 *   bun scripts/create-release-broadcast.ts --month previous
 *   bun scripts/create-release-broadcast.ts --version v0.3.0 --dry-run > email.html
 *
 * Notes come from the version's CHANGELOG.md section, or from RELEASE_BODY
 * (the GitHub release notes) when CHANGELOG.md has no section for it.
 * Env: RESEND_API_KEY, RESEND_AUDIENCE_ID (Resend segment id), optional
 * PRODUCT_UPDATES_FROM. Without the key or audience it prints a notice and
 * exits cleanly.
 */
import { appendFileSync, readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

import {
  buildReleaseEmail,
  findRelease,
  releasesInMonth,
} from '#/features/changelog/release-email.ts'

import type { ReleaseNotes } from '#/features/changelog/release-email.ts'

const { values } = parseArgs({
  options: {
    version: { type: 'string' },
    month: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
  },
})

function previousMonth(today = new Date()) {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
  return date.toISOString().slice(0, 7)
}

function summary(line: string) {
  console.log(line)
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`)
  }
}

const changelog = readFileSync('CHANGELOG.md', 'utf8')
let releases: Array<ReleaseNotes>
let month: string | undefined

if (values.month) {
  month = values.month === 'previous' ? previousMonth() : values.month
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error(`Bad --month: ${month}`)
  releases = releasesInMonth(changelog, month)
} else if (values.version) {
  const fromChangelog = findRelease(changelog, values.version)
  const body = process.env.RELEASE_BODY?.trim()
  releases = fromChangelog
    ? [fromChangelog]
    : body
      ? [{ version: values.version.replace(/^v/, ''), date: null, markdown: body }]
      : []
} else {
  throw new Error('Pass --version <tag> or --month <YYYY-MM|previous>')
}

if (releases.length === 0) {
  summary(`No release notes found for ${month ?? values.version}; no broadcast created.`)
  process.exit(0)
}

const email = buildReleaseEmail(releases, { month })

if (values['dry-run']) {
  console.log(email.html)
  process.exit(0)
}

const apiKey = process.env.RESEND_API_KEY
const audienceId = process.env.RESEND_AUDIENCE_ID
if (!apiKey || !audienceId) {
  summary('RESEND_API_KEY or RESEND_AUDIENCE_ID is not set; no broadcast created.')
  process.exit(0)
}

const response = await fetch('https://api.resend.com/broadcasts', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  // No `send` field: Resend keeps the broadcast as a draft.
  body: JSON.stringify({
    segment_id: audienceId,
    from: process.env.PRODUCT_UPDATES_FROM || 'HisaabKro <updates@hisaabkro.in>',
    reply_to: 'support@hisaabkro.in',
    subject: email.subject,
    html: email.html,
    name: month ? `Monthly digest ${month}` : `Release ${releases[0].version}`,
  }),
})

if (!response.ok) {
  throw new Error(`Resend broadcast failed (${response.status}): ${await response.text()}`)
}

const { id } = (await response.json()) as { id: string }
summary(`Draft broadcast created: "${email.subject}"`)
summary(`Review and send: https://resend.com/broadcasts/${id}`)
