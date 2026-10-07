# Use Paan Party on Android and iPhone

One deployed HTTPS address works on both phones. Share the address using **Install / share > Share app link** in the app. The link opens the app without including customer details, invoice IDs or sign-in tokens.

The updated source includes a home-screen app manifest, Android icons, an iPhone icon, standalone launch and an installation guide inside the app. It is ready to publish; these changes are not yet deployed to your Cloudflare account.

## Android

1. Open the deployed address in Chrome, outside any messaging app's built-in browser.
2. Sign in and open **Install / share**.
3. Choose **Install app** if the button appears. Otherwise open Chrome's three-dot menu and choose **Add to Home screen** or **Install app**.
4. Confirm, then open Paan Party from its home-screen icon.

Chrome's automatic install prompt may take some interaction and time to appear. The browser menu is available as a fallback.

## iPhone

1. Open the same deployed address in Safari and sign in.
2. Tap **Share**, or open the page menu and choose **Share**.
3. Choose **Add to Home Screen**. Turn on **Open as Web App** if shown, then tap **Add**.
4. Open Paan Party from its home-screen icon. Sign in again if requested.

If Add to Home Screen is missing, scroll to **Edit Actions** in Safari's Share menu and add it.

## Let your partner sign in

In the Cloudflare Access application for this Worker, edit its **Allow** policy. Add both your sign-in email and your partner's sign-in email under **Include > Emails**. Save the policy. Each partner signs in with their own approved identity. Follow [PHONE.md](PHONE.md) for deployment first.

This version keeps invoices separate by signed-in identity. Sharing the app link grants no access to someone else's invoices. Opening the app with the same identity on another phone loads that identity's saved records from the server. A shared team invoice workspace would require a separate change.

## Internet and updates

An internet connection is required to open the app, load invoices and save changes. If a save fails, keep the page open and use Retry save after reconnecting. Invoice data is not cached by a service worker. A home-screen launch fetches the current app from the server, and sign-in can expire like it does in a browser.

If you switch from the workers.dev address to a custom domain, share and install using the new domain. Browser installation identifies an app by its origin, so an old icon continues opening the old address.

## Validation before business use

The source build and automated checks cover install-prompt handling, dismissed installs, clean sharing links and the existing invoice functions. Actual installation, Cloudflare sign-in and PDF downloads still need a check on the real Android and iPhone after deployment.

## Official references

- [Chrome installation requirements](https://web.dev/articles/install-criteria)
- [Turn a website into an iPhone app](https://support.apple.com/en-mk/guide/iphone/iphea86e5236/ios)
- [Cloudflare Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
