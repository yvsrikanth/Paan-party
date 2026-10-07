# Deploy on Cloudflare's free tiers

For setup from a phone, use [PHONE.md](PHONE.md). The steps below use a computer terminal.

Use Workers Free, a D1 database and Zero Trust Free for private sign-in. Cloudflare supplies a `workers.dev` URL; a purchased domain is optional. These services have usage limits, so select the free plans and monitor your usage.

## Start without a purchased domain

The default configuration enables `workers_dev` and leaves out custom-domain routes. This lets you deploy before buying a domain. Wrangler will print the real address, in the form `https://paan-party.YOUR_ACCOUNT_SUBDOMAIN.workers.dev`; the account subdomain is assigned by your Cloudflare account.

`paanpartyinvoice.com` is the planned custom domain. Its availability and registration price must be checked before purchase. Registration is separate from free-tier hosting. The app has not yet been deployed to your Cloudflare account or connected to this domain. The existing hosted app and its invoice records are separate from this new deployment.

As checked on October 2, 2026, Workers Free includes 100,000 Worker requests/day. D1 Free includes 5 GB total storage, 5 million rows read/day and 100,000 rows written/day. Access has a free plan for up to 50 users. This project's authentication runs before every asset request, so those requests invoke the Worker and count toward its quota.

## 1. Install and sign in

Create an account at <https://dash.cloudflare.com>, install Node.js 24, and run in the project directory:

```bash
npm ci
npx wrangler login
npx wrangler d1 create paan-party-db
```

Copy the returned database ID into `d1_databases[0].database_id` in `wrangler.json`, replacing the placeholder. If the database name is already used, choose another and update `database_name` too.

## 2. Create tables and deploy

```bash
npx wrangler d1 migrations apply paan-party-db --remote
npm run deploy
```

Wrangler prints your URL. Until sign-in setup is finished, this deployment returns a setup/sign-in error. It does not expose invoice data or trust browser-supplied user IDs.

## 3. Enable private sign-in

Open **Workers & Pages > paan-party > Access**. Choose **Protect this Worker behind Access**, choose **All traffic**, and configure an authentication policy allowing your account. Apply Access. Use Zero Trust Free when prompted to choose a plan.

For your partner's phone, add both approved sign-in emails to the Allow policy's **Include > Emails** rule. This lets both people use the app, with separate invoices per identity. After deployment, see [HOME-SCREEN.md](HOME-SCREEN.md) for installing and sharing the app on Android and iPhone.

Verify that sign-in protects the actual `workers.dev` URL. Worker-wide **All traffic** protection also covers custom domains added later. If you instead use a hostname-based Access application, configure it for the actual hostname and allow your sign-in email. The app rejects requests without a valid token for the configured AUD.

In **Zero Trust > Access controls > Applications**, configure that application and copy its **Application Audience (AUD) Tag** from Additional settings. Find your Zero Trust team domain, of the form `https://YOUR_TEAM.cloudflareaccess.com`.

Set both values in `wrangler.json`:

```json
"vars": {
  "ACCESS_TEAM_DOMAIN": "https://YOUR_TEAM.cloudflareaccess.com",
  "ACCESS_AUD": "YOUR_APPLICATION_AUD_TAG"
}
```

These identify the sign-in service and application; they are not passwords. Putting them in this file preserves configuration on later deployments. Do not put API tokens, private keys or login cookies in GitHub.

## 4. Redeploy and open

```bash
npm run deploy
```

Open the URL, sign in through Access and enter your first invoice. The app and API share an origin, and invoices save to D1. The adapter verifies token signature, issuer, audience and expiration against current Access public keys, and uses the signed-in user's subject as the invoice owner. No ChatGPT account or OpenAI API key is needed for this deployment.

Confirm sign-in, save and reopen an invoice, and download its PDF before using the new deployment for business.

## 5. Connect paanpartyinvoice.com after registration

In your Cloudflare dashboard, open **Domain Registration > Register Domains** and search for `paanpartyinvoice.com`. Check availability, the selected registration term, the price and auto-renew settings before completing a purchase. Cloudflare requires a verified account email and accurate registration contact information. This package does not purchase a domain.

Once you own the domain and its zone is active in the same Cloudflare account, add this top-level property to `wrangler.json`:

```json
"routes": [{ "pattern": "paanpartyinvoice.com", "custom_domain": true }]
```

Keep `workers_dev: true` if you want both addresses. Run `npm run deploy`; Cloudflare creates the custom-domain DNS record and HTTPS certificate. If you register the domain elsewhere, first add it to Cloudflare and activate the zone by completing nameserver setup.

Open `https://paanpartyinvoice.com` and verify sign-in, saved invoices and PDF downloads again. Worker-wide Access protection covers this hostname. With hostname-based Access protection, update the Access application to include the custom domain and confirm the configured AUD is valid there before using it.

## Updates

Pull your GitHub changes locally and run `npm run deploy`. To automate publication, connect the repository in Cloudflare Workers Builds after the first manual setup. Use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. The included GitHub Actions workflow checks/builds only and contains no deployment credentials.

When changing the schema, edit `db/schema.ts` and run:

```bash
npm run db:generate
npx wrangler d1 migrations apply paan-party-db --remote
npm run deploy
```

Keep applied migrations immutable; append new ones. This source export contains no existing invoice records, so the new database starts empty.

## Official references

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)
- [Access pricing](https://www.cloudflare.com/plans/)
- [Protect a Worker with Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Token validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Static assets](https://developers.cloudflare.com/workers/static-assets/binding/)
- [Worker custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [workers.dev addresses](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Register a domain](https://developers.cloudflare.com/registrar/get-started/register-domain/)
