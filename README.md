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

Checks cover rate validation and cent-accurate totals, Excel clipboard parsing and limits, quantity/date logic, Angular component actions, database persistence, ownership, concurrent saves, PDF pagination, and Cloudflare authentication. Live browser interactions and deployment in your own Cloudflare account have not been tested.

## Use the app

1. Enter Bill to, invoice number and date.
2. Set Rates per paan in Invoice details, then enter dated whole-number quantities. Rates are saved with each invoice and reused for the next new invoice; earlier invoices without rate fields keep $2/$3.
3. Drag a selected date cell's bottom corner over following rows to fill consecutive dates. On phones or keyboards, select a date and use Fill dates, choosing the count and interval; this can add more rows.
4. Add/delete deliveries. Drag a row number to reorder, or focus it and use the up/down arrow keys.
5. Generate invoice to preview, download PDF or print.
6. Changes save automatically. New invoice saves the current invoice before starting another. Saved invoices reopens earlier records.

Reset asks for confirmation, then clears the current invoice's customer, invoice number, delivery dates, quantities and totals, and returns the invoice date to today. It saves this cleared invoice while keeping its rates, business address and other saved invoices.

Copy a rectangular Excel range and paste into the first target Date, Meetha or Flavour cell. Columns follow Date, Meetha, Flavour; extra rows are added automatically. Paste cells opens a text box for phones or browsers where direct date-cell paste is unavailable. Copy entries copies the ledger, including headings, back to Excel.

Dates accept YYYY-MM-DD, US month/day/year, named months such as 05-Aug-26, and Excel's 1900-system serial dates. Quantities must be whole numbers; blank quantity cells become zero. Invalid blocks are rejected without changing existing cells. Paste overwrites the target cells, leaves cells outside the pasted range intact, and supports up to 500 invoice rows.

## GitHub and hosting

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
