# Paan Party

An Angular app for Meetha and Flavour deliveries, editable rates (initially $2/$3), Excel copy/paste and date filling, automatic totals, saved invoices, your Paan Party logo, and printable/PDF invoices.

This standalone export is ready for your own GitHub repository and Cloudflare account. It includes the Angular frontend, API, database schema/migration, assets, dependency lockfile, automated checks and deployment configuration. It contains no existing invoice records or original hosted account identifiers; a new deployment starts with an empty database.

## Run locally

Install Node.js 24 and open a terminal in the extracted project directory:

```bash
npm ci
npm run dev
```

Open <http://localhost:4173>. The API runs on port 8788 and saves to local SQLite in `.sites-runtime/`. Local development uses a test identity; production requires Cloudflare Access.

```bash
npm run check
npm run build
```

Checks cover rate validation and cent-accurate totals, Excel clipboard parsing and limits, quantity/date logic, Angular component actions, database persistence, ownership, concurrent saves, PDF pagination, Cloudflare authentication, installation events and clean sharing links. Deployment, sign-in and home-screen installation on your actual phones still need verification in your own Cloudflare account.

## Use the app

The app can be shared to Android and iPhone and added to each phone's home screen after HTTPS deployment. Choose **Install / share** for installation instructions and the share link. See [HOME-SCREEN.md](HOME-SCREEN.md). An internet connection is required; invoices remain separate for each approved sign-in.

1. Enter Bill to and the invoice date. The invoice number is filled automatically as YYYYMMDD-01, -02 and so on, continuing after the highest saved number for that date. The date sequence starts at 01 for a new day. You can override the number manually.
2. Set Rates per paan in Invoice details, then enter dated whole-number quantities. Rates are saved with each invoice and reused for the next new invoice; earlier invoices without rate fields keep $2/$3.
3. Drag a selected date cell's bottom corner over following rows to fill consecutive dates. On phones or keyboards, select a date and use Fill dates, choosing the count and interval; this can add more rows.
4. Add/delete deliveries. Drag a row number to reorder, or focus it and use the up/down arrow keys.
5. Enter an optional **Previous balance ($)** in Invoice details. The invoice shows the paan subtotal and previous balance separately, then adds them to the grand total. A new invoice starts at $0; an older saved invoice without this field also starts at $0.
6. Generate invoice to preview, download PDF or print. The invoice is saved before preview or download so it uses its assigned number. The PDF is named **Billing name-Invoice number.pdf**, for example **Firefly Alpharetta-20261008-01.pdf**. Characters that cannot be used in filenames are replaced with hyphens.
7. Changes save automatically. New invoice saves the current invoice before starting another. Saved invoices reopens earlier records.

Reset asks for confirmation, then clears the current invoice's customer, delivery dates, quantities, previous balance and totals, returns the invoice date to today, and generates a new invoice number. It saves this cleared invoice while keeping its rates, business address and other saved invoices.

Automatic numbers are assigned in the same database write that saves the invoice, keeping simultaneous saves on two phones from claiming the same number for the same sign-in. The sequence follows the invoice date when the number is assigned; later edits keep that number. Existing invoices keep their numbers. This update uses the existing invoice table and needs no additional database migration. An older app tab that does not send the new balance field preserves a previously saved balance; explicitly entering $0 clears it.

Copy a rectangular Excel range and paste into the first target Date, Meetha or Flavour cell. Columns follow Date, Meetha, Flavour; extra rows are added automatically. Paste cells opens a text box for phones or browsers where direct date-cell paste is unavailable. Copy entries copies the ledger, including headings, back to Excel.

Dates accept year-first dates (2026-04-02 or 2026/04/02), named months (02-Apr-26, Apr-02-26 or April 2, 2026), and Excel's 1900-system serial dates, including date-time numbers. Only the calendar date is kept; time zones do not shift a delivery to another day. Automatic date order checks the entire copied date column for an unambiguous month/day or day/month date. If every numeric date is ambiguous, it uses US month/day. In **Paste cells**, choose **Day/month/year** for a day-first Excel sheet and check the date preview before pasting. The chosen order also applies to direct cell paste until the page is reloaded. A range with conflicting numeric date orders is rejected in Automatic mode. Copied entries use YYYY-MM-DD so the app can import them again with either date order.

Headings such as Date, Meeta/Meetha/Meeth Quantity and Flavor/Flavour Quantity can be included. The importer also accepts Meeeth Quantity with an extra "e". Unrecognized or reordered headings report the heading column instead of a delivery date error. Quantities must be whole numbers; blank quantity cells become zero. Invalid blocks are rejected without changing existing cells. Paste overwrites the target cells, leaves cells outside the pasted range intact, and supports up to 500 invoice rows. Excel numbers assume the standard 1900 date system; format dates with a written month before copying from a workbook that uses the older 1904 system.

## GitHub and hosting

The source is maintained in [yvsrikanth/Paan-party](https://github.com/yvsrikanth/Paan-party). Connect this repository's `main` branch in Cloudflare Workers Builds.

Using only a phone? Follow [PHONE.md](PHONE.md) for GitHub and Cloudflare dashboard setup. The package includes a Console database setup script and a Node.js 24 version file for cloud builds.

See [GITHUB.md](GITHUB.md) to save this project to your account. GitHub Actions checks and builds it; publication is separate.

See [CLOUDFLARE.md](CLOUDFLARE.md) for free-tier hosting setup. Cloudflare Workers serves the Angular app and API; D1 stores invoices; Access handles private sign-in. This replaces the original ChatGPT sign-in for your independent deployment. Static hosting alone cannot run the API/database.

The default deployment uses your Cloudflare `workers.dev` address, so you can start before buying a domain. Configure D1 and Access first. `CLOUDFLARE.md` includes the steps to register and later connect `paanpartyinvoice.com`; its availability and price still need to be checked. The app has not yet been published to your Cloudflare account.

## Source layout

| Path | Purpose |
|---|---|
| `src/` | Angular UI, quantity/date model, PDF generation |
| `public/` | Your logo and licensed invoice fonts |
| `worker/index.ts` | Invoice API |
| `worker/cloudflare.ts` | Cloudflare Access adapter |
| `db/`, `drizzle/` | Database schema and migration |
| `wrangler.json` | Hosting configuration |
| `.github/workflows/build.yml` | GitHub checks and build |
| `scripts/` | Development and validation |

The logo is extracted from your screenshot, so its resolution is limited. The business address is editable. PDFs embed DejaVu fonts; scripts requiring complex text shaping need additional font support. Invoices belong to each signed-in identity: adding another authorized visitor does not share existing invoices with them.
