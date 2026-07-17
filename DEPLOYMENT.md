# Deployment Runbook — one restaurant, one deployment

Backend on **Railway** (Express + PostgreSQL + Socket.IO), frontend on **Netlify or Vercel** (static React build). Any equivalent hosts work — the app only needs Node 20+, PostgreSQL, and a static host.

## 1. Backend (Railway)

1. New Project → Deploy from GitHub repo. `railway.toml` builds and starts from `server/` (healthcheck `/api/health`).
2. Add **PostgreSQL** to the project; Railway injects `DATABASE_URL` automatically.
3. Initialize the schema once (from your machine):
   ```bash
   psql "$DATABASE_URL" -f create-all-tables.sql
   ```
4. Set service variables:
   ```
   NODE_ENV=production
   JWT_SECRET=<64+ random chars>          # openssl rand -hex 48
   INITIAL_MANAGER_USERNAME=admin
   INITIAL_MANAGER_PASSWORD=<strong password>   # remove after first login
   ALLOWED_ORIGINS=https://<restaurant-domain>,https://www.<restaurant-domain>
   VAPID_PUBLIC_KEY=...                   # npx web-push generate-vapid-keys
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:admin@<restaurant-domain>
   SMTP_HOST=smtp.hostinger.com           # or your provider
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=orders@<restaurant-domain>
   SMTP_PASS=<smtp password>
   EMAIL_FROM=orders@<restaurant-domain>
   ```
5. Deploy. First boot seeds the Manager account and logs `Seeded initial Manager account`.

## 2. Frontend (Netlify or Vercel)

- Build: `cd client && npm run build`, publish `client/build` (root `netlify.toml` already does this; `client/vercel.json` for Vercel).
- Environment (build-time):
  ```
  REACT_APP_API_URL=https://<railway-backend-url>
  REACT_APP_SOCKET_URL=wss://<railway-backend-url>
  ```
- Point the restaurant domain's DNS at the frontend host; add the domain to the backend's `ALLOWED_ORIGINS`.

> Alternative single-host mode: copy `client/build/*` into `server/public/` and let the backend serve the SPA (`NODE_ENV=production` enables the catch-all route). Remember to re-copy after every client change — the PWA manifests and `sw.js` live in that build.

## 3. Restaurant onboarding

1. `/admin` → log in with the seeded Manager account → change the password (Admin → Staff → reset password), then remove `INITIAL_MANAGER_PASSWORD` from the env.
2. Settings → Business: name, logo, brand color, phone, address, currency, VAT/service charge, operating hours. These drive the customer app, receipts, and PWA branding.
3. Settings → Integrations: upload payment QR codes (eSewa / Khalti / FonePay).
4. Settings → Notifications: notification email + per-order-type email toggles; use **Send test email** to verify SMTP.
5. Admin → Staff: create Cashier / Chef / Waiter / Kitchen Helper accounts.
6. Admin → Menu: enter or import the menu (`server/scripts/import-menu-from-csv.js`).
7. Settings → Tables: set table count, print QR codes for tables.

## 4. Station setup (PWAs)

On each device, open the page for its role and use the browser's **Install app / Add to Home Screen** — the installed app always opens on that page:

| Station | Install from |
|---|---|
| Cashier counter | `/pos` |
| Reception desk | `/reception` |
| Kitchen display | `/kitchen-tv` |
| Manager phone/desktop | `/admin` |
| Waiter phones | `/staff` |

After installing, tap **Enable sound** (amber banner) once so order alerts ring, and allow notifications when prompted (push notifications deep-link to the order when tapped).

## 5. Smoke test

- Customer: scan a table QR (`/<tableId>`), place an order.
- Kitchen: order appears on `/kitchen-tv` instantly with a chime.
- POS: ring up a takeaway sale with a discount, cash payment → receipt + KOT print, sale visible in Daybook and Admin → Reports.
- Reception: take payment on the table order, clear the table, close the day.
- Email: test-email button round-trips; order email arrives if enabled.
- `GET https://<backend>/api/health` returns OK (Railway healthcheck uses this).

## Notes

- Node 20+ (`engines` in package.json, `nixpacks.toml`, `Dockerfile` are aligned).
- Service-worker cache is versioned (`client/public/sw.js` `CACHE_NAME`); bump it on releases — installed clients auto-update via SKIP_WAITING.
- If credentials ever leak, rotate: DB password, `JWT_SECRET`, SMTP password, VAPID keys, staff passwords.
