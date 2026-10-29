# Release process

How every HisaabKro web release reaches users. The mobile app (`mobile/`) has
its own store release flow and is not covered here.

## Where release notes live

`CHANGELOG.md` at the repo root is the single source of truth. It follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The app reads it at
build time, so after a deploy:

- the public page `https://hisaabkro.in/changelog` shows every release, and
- the in-app **Help → What's new** panel shows the latest five, with a dot on
  the Help button until a user opens it (remembered per browser).

Only dated releases are shown. `## [Unreleased]` stays private until it is
released.

Section names map to what users see:

| CHANGELOG heading          | Shown as |
| -------------------------- | -------- |
| `Added`                    | New      |
| `Changed`, `Deprecated`, `Removed` | Improved |
| `Fixed`, `Security`        | Fixed    |

## In every PR

Each PR with a user-facing change adds its lines under `## [Unreleased]` in
the same PR, and updates any docs whose behaviour it changes.

Write for a shop owner or accountant, not a developer:

- Say what changed for them: "Invoice numbers have no gaps", not "allocate
  sequence inside the posting transaction".
- One line per change, starting with the thing that changed.
- Never include customer names, GSTINs, amounts, balances or other real data.
  The repo and the changelog page are public.
- Internal-only changes (refactors, tests, tooling) don't need an entry.

## Cutting a release

1. **Pick the version** with [Semantic Versioning](https://semver.org/):
   - patch `0.2.1`: only fixes;
   - minor `0.3.0`: anything new or improved;
   - major `1.0.0`: a change users must act on (for example a data migration
     they must run, or a removed feature).
2. **Release PR** (`release: vX.Y.Z`):
   - rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD` and add a fresh
     empty `## [Unreleased]` above it;
   - set `"version"` in `package.json` to `X.Y.Z`. A test fails if it doesn't
     match the newest CHANGELOG release.
   - run `bun run test`, `bun run lint` and `bun run build`.
3. **Merge** the release PR to `main`.
4. **Deploy** from `main` (`bun run deploy`). Run any migrations listed in the
   release first, against production, deliberately.
5. **Tag and publish the GitHub Release** with the same notes:

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z
   ```

   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --notes-file notes.md
   ```

   `notes.md` is the release's section copied from `CHANGELOG.md`.
6. **Check** `https://hisaabkro.in/changelog` shows the new release.
7. **Send the product update email.** Publishing the GitHub Release creates a
   draft broadcast in Resend (see below). Open the link in the workflow run
   summary, check it, send a test to yourself, then press Send in Resend.

## Product update emails

Users who turn on **Settings → Email → Email me product updates** get release
notes by email. It is off by default.

### How it works

- **Consent** is stored per user in `user_preferences` (migration
  `drizzle/0012_user_preferences.sql`): `product_updates`, the time consent
  was given (`product_updates_consented_at`) and withdrawn
  (`product_updates_withdrawn_at`).
- **Audience sync.** Turning the switch on creates or resubscribes the user as
  a Resend contact in the `RESEND_AUDIENCE_ID` segment. Turning it off marks
  the contact `unsubscribed` (the contact is kept, so the opt-out stays on
  record in Resend). If Resend rejects the change, the switch doesn't move.
  With `RESEND_AUDIENCE_ID` unset, only the preference is stored.
- **Unsubscribe.** Every email carries `{{{RESEND_UNSUBSCRIBE_URL}}}`, and
  Resend adds the List-Unsubscribe header. An unsubscribe in Resend always
  wins: when an opted-in user opens Settings, the app checks the contact and
  turns the switch off if Resend says unsubscribed. The app never
  resubscribes anyone on its own; only the user turning the switch back on
  does. Transactional email (password reset, invites, invoices) is not
  affected.
- **Drafting.** `.github/workflows/product-update-email.yml` runs on
  `release: published` (skipping pre-releases). It runs
  `scripts/create-release-broadcast.ts`, which takes the version's section of
  `CHANGELOG.md` (or the GitHub release notes if `CHANGELOG.md` has none),
  turns it into simple HTML and creates a **draft** broadcast. It never sends.

### One-time setup

1. In Resend, verify the sending domain (`hisaabkro.in`).
2. Create a segment (Resend's new name for an audience), for example
   "Product updates", and copy its ID.
3. Put the segment ID in `RESEND_AUDIENCE_ID` under `vars` in
   `wrangler.jsonc` (next to `EMAIL_FROM`), and set `RESEND_API_KEY` in
   Cloudflare → Worker → Settings → Variables and secrets as type
   **Secret**. Don't add plain variables in the dashboard: every deploy from
   `main` removes any plain variable that isn't in `wrangler.jsonc`.
   For local dev, override `RESEND_AUDIENCE_ID` in `.env.local` with a
   separate test segment, so test sign-ups never land in the real list.
4. In GitHub → Settings → Secrets and variables → Actions:
   - secret `RESEND_API_KEY`: a Resend key with full access (sending-only
     keys can't create broadcasts);
   - variable `RESEND_AUDIENCE_ID`: the same segment ID;
   - optional variable `PRODUCT_UPDATES_FROM`, for example
     `HisaabKro <updates@hisaabkro.in>` (that is the default).
5. Run migration `0012_user_preferences.sql` against production before
   deploying the release that ships the switch.

Without the secret or variable, the workflow logs a notice and creates
nothing.

### Preview or redo a draft

```bash
bun scripts/create-release-broadcast.ts --version v0.3.0 --dry-run > email.html
```

To redo a draft, delete it in Resend and re-run the workflow from the Actions
tab (**Run workflow**, with the tag in `version`).

### Monthly digest instead of one email per release

If releases ship more often than users want email, set the repo variable
`PRODUCT_UPDATES_CADENCE` to `monthly`. Releases then stop creating drafts,
and on the 1st of each month the workflow drafts one digest of the previous
month's releases (nothing if there were none). To draft a digest by hand, run
the workflow with `month` set to `YYYY-MM`, or:

```bash
bun scripts/create-release-broadcast.ts --month 2026-11 --dry-run > digest.html
```

## Help and support

- **Help → Report a problem** emails `support@hisaabkro.in` through Resend
  (`RESEND_API_KEY` must be set on the Worker as a Secret). The email carries the user's
  description, their name and email (as reply-to), the page path without
  query string, the app version and the browser. It never includes balances,
  party data or session tokens.
- **Help → Contact support** opens a `mailto:support@hisaabkro.in` link.
- **Help → Keyboard shortcuts** lists shortcuts in
  `src/features/support/components/keyboard-shortcuts-dialog.tsx`. Update it
  in the same PR when you add or change a shortcut.
