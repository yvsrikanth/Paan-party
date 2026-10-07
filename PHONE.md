# Deploy using your phone

This route uses GitHub and Cloudflare's dashboard. Cloudflare installs dependencies, builds Angular and deploys the Worker. Your phone is used for account sign-in and configuration.

The project source is in [yvsrikanth/Paan-party](https://github.com/yvsrikanth/Paan-party). Cloudflare publication is still pending. It starts on a `workers.dev` address. A purchased domain can be added later.

## 1. Use the GitHub repository

Use the existing **yvsrikanth/Paan-party** repository and its **main** branch when connecting Cloudflare. The source files are at the repository root.

The repository must contain the extracted project files at its root: `package.json`, `package-lock.json`, `wrangler.json`, `.nvmrc`, `src/`, `worker/`, `public/`, `db/`, `drizzle/` and `scripts/`. A repository containing only the ZIP cannot be built. Include `.github/workflows/build.yml` for build checks.

## 2. Create the database

In your own browser, sign in to Cloudflare. Open **D1 SQL database**, choose **Create Database**, and create a new empty database named `paan-party-db`. Copy its Database ID.

Open that database's **Console**. In GitHub, open `db/phone-setup.sql`, copy its SQL, paste it into the Console and select **Execute**. Confirm the `invoices` and `d1_migrations` tables appear. The script creates the invoice schema and records the initial migration so later migration updates can continue normally.

In the repository's `wrangler.json`, replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with this ID. Keep the binding named `DB`. Use a different database name if `paan-party-db` is already occupied and update `database_name` too. These configuration edits can also be applied through ChatGPT when repository write access is available.

## 3. Connect the repository to Cloudflare

Open **Workers & Pages > Create application > Import a repository**. Connect your GitHub account and select the app repository. Use these settings:

| Setting | Value |
|---|---|
| Worker name | `paan-party` |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

The Worker name must match `name` in `wrangler.json`. The included `.nvmrc` selects Node.js 24. Save and deploy, and wait for a successful build. Cloudflare provides the real `workers.dev` address. The app shows a setup/sign-in error until the next step is completed.

## 4. Set up private sign-in

Open **Workers & Pages > paan-party > Access**. Choose **Protect this Worker behind Access**, select **All traffic**, choose a policy allowing your sign-in identity and apply Access. Select the free Zero Trust plan when offered.

To let your partner use it too, add both your sign-in email and theirs to the Allow policy's **Include > Emails** rule. Each person sees their own saved invoices in this version.

In **Zero Trust > Access controls > Applications**, open the created application and copy its **Application Audience (AUD) Tag** from Additional settings. Find your team domain, such as `https://YOUR_TEAM.cloudflareaccess.com`.

Set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `wrangler.json` to those actual values and commit the change. They identify the Access service and application; they are not passwords. This commit triggers a new Cloudflare build.

See [CLOUDFLARE.md](CLOUDFLARE.md) for authentication details and future schema updates.

## 5. Check the app

After the build succeeds, open the provided address in your phone browser and sign in. Enter an invoice, change its rates, save and reopen it, and download its PDF. Check the cheque/Zelle footer, totals, copy/paste and Reset. Your new database begins with no invoice records.

Choose **Install / share** to send the app link to your partner and add a home-screen icon. Follow [HOME-SCREEN.md](HOME-SCREEN.md) for Android and iPhone instructions. Test installation, sign-in and saving on both phones.

## 6. Add your domain later

Search for `paanpartyinvoice.com` in Cloudflare's domain registration screen and review availability and price. Once you own it, follow the custom-domain section in [CLOUDFLARE.md](CLOUDFLARE.md). Recheck sign-in and invoice saving on the new address.

## Official references

- [Connect a repository and deploy](https://developers.cloudflare.com/workers/ci-cd/builds/)
- [Build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [Node version files](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
- [D1 dashboard setup and Console](https://developers.cloudflare.com/d1/get-started/)
- [Protect a Worker with Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
