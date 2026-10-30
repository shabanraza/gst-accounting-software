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

- The GSTR-1 report now includes sales to unregistered customers: B2C large invoices (other-state sales above ₹1 lakh) and B2C small totals by place of supply and GST rate. These are also in the GSTR-1 JSON export.
- You can upload the GSTR-1 file downloaded from the GST portal to compare it with your sales invoices, instead of pasting it.
- GSTR-1 now includes credit notes from sales returns: notes to registered customers and notes against B2C large invoices each have their own section, and other returns from unregistered customers reduce the B2C small totals. GSTR-3B and the dashboard GST card count the same credit notes, and purchase returns now reduce input GST.
- The GSTR-1 report is laid out section by section as on the GST portal (B2B, B2C large, B2C others, credit notes), with section totals and a line for each GST rate on an invoice.
- Download GSTR-1 as a JSON file in the GST portal's upload layout for the period you pick.

### Changed

- The GSTR-1 report now shows one return period at a time (this month by default) instead of the whole financial year.
- Companies without a GSTIN now see that they don't file GSTR-1, instead of an empty report.
- A redesigned home page at hisaabkro.in with real screens from the app: the dashboard, a GST tax invoice, stock, ageing and the HSN summary.

### Fixed

- Cancelled sales invoices are no longer counted in GSTR-1, GSTR-3B or the GST card on the dashboard.
- GST reports now use the place of supply on each sales invoice (for example a ship-to state) instead of the customer's state, so CGST/SGST or IGST is shown correctly.
- The Stock page now marks an item as low stock when it is at or below its reorder level, matching the dashboard's low-stock alert. Items with no reorder level still show as low when they run out.
- Clearer wording on the Stock page and in the GSTR-1 comparison.

## [0.3.0] - 2026-10-29

### Added

- A public changelog at hisaabkro.in/changelog, and a "What's new" panel inside the app.
- A Help menu in the app with the help center, keyboard shortcuts, contact support and a "Report a problem" form.
- Product update emails you can turn on in Settings. They're off unless you choose them, and every email has an unsubscribe link.
- You can choose product update emails when you sign up, or say yes or no once after saving an invoice.
- Move from Tally: import your parties, stock items and opening stock straight from a Tally masters export (XML). Excel (.xlsx) files can be imported too, and common column names such as "Customer Name", "Stock Item", "UOM" and "IGST" are recognised.
- The import check now lists which rows have problems and why.
- A new dashboard. The top shows this month's sales, what customers owe you (and how much is overdue), what you owe suppliers (and what falls due this week), and cash and bank.
- A setup checklist for new companies: business details, first party, first item and first sales invoice, each ticked off as you do it.
- Send a payment reminder on WhatsApp straight from an overdue customer on the dashboard, or record their receipt in one click.
- A GST card on the dashboard with this month's output GST, input tax credit, net payable and the monthly filing dates.
- Top dues: your largest customer and supplier balances, with the overdue part.
- Quick actions for a new sale, purchase, receipt or payment, with keyboard shortcuts Alt+S, Alt+P, Alt+R and Alt+Y.
- Goa, Puducherry, Ladakh, Lakshadweep, Andaman and Nicobar Islands, and Dadra and Nagar Haveli and Daman and Diu are now in the state list.

### Fixed

- Imported items keep their GST rate, and 6- and 8-digit HSN codes are accepted. Items without an HSN can be imported too; they get 0000 until you add the real code.
- Importing opening stock for an item you already have adds the stock to it instead of creating a duplicate item.
- Imported parties with an unrecognised state now get your company's state instead of Maharashtra.
- The import screen starts empty instead of pre-filled with sample rows.

### Changed

- Invoices and bills can be filled in from the keyboard: the party field is ready when the page opens, picking a party or item moves you to the next field, and Enter on the last cell starts a new line.

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
