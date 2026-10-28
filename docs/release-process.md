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

## Help and support

- **Help → Report a problem** emails `support@hisaabkro.in` through Resend
  (`RESEND_API_KEY` must be set on the Worker). The email carries the user's
  description, their name and email (as reply-to), the page path without
  query string, the app version and the browser. It never includes balances,
  party data or session tokens.
- **Help → Contact support** opens a `mailto:support@hisaabkro.in` link.
- **Help → Keyboard shortcuts** lists shortcuts in
  `src/features/support/components/keyboard-shortcuts-dialog.tsx`. Update it
  in the same PR when you add or change a shortcut.
