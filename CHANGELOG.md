# Changelog

All notable changes to HisaabKro are recorded here. The public page at
https://hisaabkro.in/changelog and the in-app "What's new" panel are built
from this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and versions follow [Semantic Versioning](https://semver.org/). See
`docs/release-process.md` for how a release is cut.

Write entries for business users: say what changed for them, not how it was
built. Never include customer names, balances or other real data.

## [Unreleased]

### Added

- A public changelog at hisaabkro.in/changelog, and a "What's new" panel inside the app.
- A Help menu in the app with the help center, keyboard shortcuts, contact support and a "Report a problem" form.

## [0.2.0] - 2026-10-28

### Added

- Stock is valued at its moving weighted-average purchase cost, so Stock In Hand on the balance sheet matches the stock valuation report.
- Opening stock entered on an item is posted to your books against a new Opening Balance ledger.

### Changed

- New companies start with clean books: no sample parties, items or opening stock are added for you.
- Company setup asks for your business address, city and PIN, so your first invoice saves without errors. The financial year defaults to the current one.
- Moving between pages inside the app is faster.
- The dashboard shows your figures first and loads the charts after.
- Saving invoices and bills with many items is faster.
- The supplier bill number is shown in the purchase bill header instead of under "Bill options".
- Amount columns on invoices and bills fit values in crores.

### Fixed

- Invoice numbers have no gaps: a save that fails no longer uses up a number.
- Error messages say what went wrong, for example which item is short of stock, instead of a generic server error.
- Messages are solid and easy to read, appear at the top of the screen and can be closed.
- Selling an item without enough stock shows a clear "Insufficient stock" message instead of adding stock that was never bought.
- Two people selling the same item at the same moment can no longer leave the wrong stock quantity.
- A payment or invoice cancellation can no longer be applied twice when two people act at once.
- Scanned bills are saved completely or not at all. A supplier the app doesn't know yet must be added with their address first.
- "Create another" after saving opens a blank form.
- The app no longer gets stuck showing "Guest" after a brief connection problem.

## [0.1.0] - 2026-10-27

### Fixed

- Sales invoices, purchase bills and payments save completely or not at all, so a failed save can no longer leave half-written entries in your books.
- Two people saving at the same time can no longer get the same invoice number.
- Companies without a GSTIN no longer charge GST on sales, and their invoices print as a Bill of Supply.
- Printed invoices show the party's full billing address.

### Security

- Invoice and bill print pages always check that you have access to the company.
