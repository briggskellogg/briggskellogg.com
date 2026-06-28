# Newsletter subscribe proxy

Buttondown's embed form runs a Turnstile step that has been failing for this site, leaving subscribers stuck as **Unactivated**. This worker calls Buttondown's API server-side instead (no Turnstile, confirmation email only).

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
