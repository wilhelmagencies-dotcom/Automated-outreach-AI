# Locking down the outreach backend API

Status (2026-10-15): **not deployed.** The code that runs on Railway is not in any GitHub repo this
session can see, so this folder holds a tested, drop-in module and the steps to wire it in.

## What is exposed today (read-only checks, 2026-10-15)

| URL | Anonymous result |
|---|---|
| `backend-production-d2ee.up.railway.app/api/conversations`, `/api/zapbox/replies`, `/api/state` | 200 with lead data |
| Same paths via `wilhelm-agencies-hq-app.netlify.app/api/...` (Netlify proxies `/api/*` and `/auth/*`) | 200 with lead data |
| `backend-production-d2ee.up.railway.app/auth/google` | 302 to Google consent for Calendar, Gmail and Drive. Anyone can start it, so `/auth/callback` could be fed someone else's Google account |
| `passionate-playfulness-production.up.railway.app/batch/status`, `/batch/history` | 200 (aggregate counts, no contact data seen) |
| `passionate-playfulness-production.up.railway.app` `POST /scrape-location`, `/upload-to-sendline`, `/batch/*` (from the HQ bundle) | not tested (write endpoints); assume open |

The HQ app (`index-JnAbau_O.js`) has **no sign-in**. Its fetch wrapper only sends `Content-Type`,
and `/auth/google` connects the backend's Google account rather than signing a user in. So there
is no session to reuse; this module adds one.

## Where the code lives (what was checked)

- `wilhelmagencies-dotcom/outreach-backend` was last pushed on 2026-04-25. It has no `/api/zapbox/*`,
  `/auth/google`, `/auth/status` or `/health`. Commit `c82d026` (2026-04-15) has the old
  `/api/conversations`. **Do not deploy this repo over the live service:** it would roll back six
  months of features.
- `wilhelmagencies-dotcom/ppm-system` is the PPM Python/FastAPI system, a different app.
- The Railway token in this session is scoped to project `ppm-ai-buyer` only. It cannot see the
  project that runs `backend-production-d2ee` or `passionate-playfulness-production`. Those were
  likely deployed with `railway up` from a local folder.

## Wiring it in (backend: `backend-production-d2ee`)

1. Copy `api-auth.js` next to the backend's `server.js`. Express is already a dependency.
2. In `server.js`, right after `app.use(express.json(...))` and **before any route**:

   ```js
   const auth = require('./api-auth')();
   app.use(auth.routes);                      // /auth/login, /auth/login/callback, /auth/me, /auth/logout
   app.use('/api', auth.requireAuth);         // every /api route now needs a session or API token
   ```

   For webhooks outside `/api` (for example `app.post('/webhooks/zapier', ...)`), add
   `auth.requireWebhookSecret` as the route's first handler. For webhooks under `/api`, list their
   paths in `WEBHOOK_PATHS`; they then need the secret instead of a session.
3. Protect the Google Calendar connect flow:
   - Add `auth.requireAuth` to `app.get('/auth/google', ...)`. A browser that isn't signed in is
     sent to `/auth/login` first.
   - Pass `state: auth.signState({ email: req.user.email })` in its Google URL.
   - At the top of `/auth/callback`, add
     `if (!auth.verifyState(req.query.state)) return res.status(403).send('Invalid state');`.
   - `/auth/status` only returns `{connected}`, so it can stay public.
4. Tighten CORS. The live app reflects any Origin with `Access-Control-Allow-Credentials: true`. Use
   `cors({ origin: 'https://wilhelm-agencies-hq-app.netlify.app', credentials: true })`. The
   `SameSite=Lax` cookie already stops other sites from using Carl's session, so this is defense in
   depth.

### Railway variables (set these before deploying; the module refuses to start without them)

| Var | Value |
|---|---|
| `SESSION_SECRET` | `openssl rand -base64 48` |
| `ALLOWED_EMAILS` | Carl's Google login(s), comma-separated, e.g. `wilhelm.agencies@gmail.com` |
| `LOGIN_GOOGLE_CLIENT_ID` / `LOGIN_GOOGLE_CLIENT_SECRET` | An OAuth "Web application" client. The existing one works if you add the redirect URI below. Falls back to `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` |
| `LOGIN_REDIRECT_URI` | `https://wilhelm-agencies-hq-app.netlify.app/auth/login/callback`. Add this exact URI in Google Cloud Console → Credentials |
| `WEBHOOK_SECRET` | `openssl rand -hex 32`. Required when `WEBHOOK_PATHS` is set |
| `WEBHOOK_PATHS` | Inbound webhook paths under `/api`, if any, e.g. `/api/zapbox/inbound` |
| `API_TOKENS` | Optional bearer tokens for scripts or the batch service, e.g. `openssl rand -hex 32` |

Use the **Netlify** URL for the login redirect, not the Railway one. The session cookie must be set
on the HQ app's own domain: the browser then sends it with every proxied `/api` call, and other
sites can't use it.

### Webhooks (Zapier, email provider)

Find the inbound routes in the live `server.js` (look for routes Zapier or the email provider
POST to). Then update each sender:

- **Zapier** (Webhooks by Zapier → POST): add header `X-Webhook-Secret: <WEBHOOK_SECRET>`.
- **Providers that only take a URL:** append `?secret=<WEBHOOK_SECRET>` to the webhook URL.

## HQ app (Netlify) changes

1. **Required.** In the API helper (the function that does ``fetch(`${op}${t}`, l)``), before
   parsing the body, add:

   ```js
   if (i.status === 401) { location.href = '/auth/login?next=' + encodeURIComponent(location.pathname + location.search); return; }
   ```

   Until this ships, Carl can open `https://wilhelm-agencies-hq-app.netlify.app/auth/login` once.
   The session lasts 30 days (`SESSION_DAYS`).
2. **Batch/scraper service.** The browser calls `passionate-playfulness-production` directly
   (`mt`/`fa` constants), so the session cookie isn't sent there. Proxy it through Netlify instead:
   `_redirects`: `/scraper/*  https://passionate-playfulness-production.up.railway.app/:splat  200`.
   Then set `mt`/`fa` to `"/scraper"`. In that service, use the same module, the same
   `SESSION_SECRET` and `ALLOWED_EMAILS`, and no login routes:

   ```js
   const auth = require('./api-auth')({ loginRoutes: false });
   app.get('/health', ...);                    // keep public, register before the guard
   app.use(auth.requireAuth);                  // everything else
   ```

## Done check

```sh
B=https://backend-production-d2ee.up.railway.app; H=https://wilhelm-agencies-hq-app.netlify.app
S=https://passionate-playfulness-production.up.railway.app
for u in $B/api/conversations $B/api/zapbox/replies $H/api/conversations $S/batch/status; do
  curl -s -o /dev/null -w "%{http_code} $u\n" "$u"; done      # expect 401 everywhere
curl -s -o /dev/null -w "%{http_code}\n" $B/health                # expect 200
```

Then:
- Sign in at `$H/auth/login` as Carl. Conversations should load.
- Fire a test Zap. It should still deliver.
- `curl -XPOST <webhook-url>` without the secret should return 401.

## Tests

`npm install && npm test` runs nine tests on Node 18 or later. They cover anonymous 401s,
allow-listed Google sign-in (token exchange mocked), tampered cookies, wrong accounts, login CSRF,
open redirects, API tokens, webhook secrets and the calendar-connect state helper.
