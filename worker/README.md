# Newsletter subscribe proxy

This worker submits website signups to Buttondown using the existing server-side API secret. The deployed configuration enables double opt-in with `REQUIRE_CONFIRMATION = "true"`.

New addresses are created as **Unactivated** and Buttondown sends its confirmation email. Existing active subscribers stay unchanged; existing unactivated subscribers can request a reminder. Unsubscribed and suppressed records are never reactivated by this flow. Buttondown's subscriber firewall stays enabled.

The frontend reports `confirmation sent` only when Buttondown accepts that request, and `subscribed` for an already-active record. Neither an API success nor the automated tests proves inbox delivery: verify a fresh address in Buttondown and confirm receipt before calling that path fully tested.

Requests have a 10-second upstream deadline. Invalid input, malformed upstream responses, and network failures never appear as success. The UI remains quiet and disables submission until the input changes after a failure.

## Verification

Run `node --test worker/subscribe.test.mjs` from the repository root. Serve the repository and open `/tools/subscribe-browser-tests.html` for mocked browser checks. These tests do not send email.

The current confirmation design is Buttondown's default transactional template. Installing the custom design requires a Buttondown plan that supports transactional email editing. Local prepared templates are separate from the deployed signup flow.

## Deploy once

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put BUTTONDOWN_API_KEY   # paste your Buttondown API key
npx wrangler deploy
```

Copy the `*.workers.dev` URL from the deploy output, then add to each essay page `<head>`:

```html
<meta name="subscribe-endpoint" content="https://YOUR-WORKER.workers.dev">
```

With that meta tag set, `/assets/subscribe.js` intercepts the form and POSTs to the worker. Without it, the form falls back to Buttondown's embed POST.

## Optional: same-origin `/api/subscribe`

If `briggskellogg.com` DNS moves to Cloudflare, uncomment the `routes` block in `wrangler.toml` and redeploy so the worker answers `https://briggskellogg.com/api/subscribe`.
