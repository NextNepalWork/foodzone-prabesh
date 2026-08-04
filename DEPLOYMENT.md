# Deployment runbook — one restaurant, one deployment

The production layout is a Hostinger VPS for the Express backend, PostgreSQL,
Socket.IO, and persistent uploads, with the React/PWA frontend on Vercel. See
[`HOSTINGER-MIGRATION.md`](HOSTINGER-MIGRATION.md) for the guarded migration
sequence from Railway.

## 1. Backend on Hostinger VPS

Use the Hostinger Ubuntu 24.04 Docker VPS template. PostgreSQL is not supported
as a local database on Hostinger's regular Web or Cloud hosting plans, and this
application also requires a persistent server process and WebSockets.

The checked-in deployment includes:

- `Dockerfile`: Node 22 production application image;
- `docker-compose.hostinger.yml`: app, PostgreSQL 18, and Caddy services;
- `Caddyfile`: automatic HTTPS and reverse proxying, including Socket.IO;
- `hostinger.env.example`: safe environment-variable template;
- named volumes for PostgreSQL, uploaded receipts/QR codes, and TLS state.

On the VPS, copy `hostinger.env.example` to `.env.hostinger`, fill it securely,
and keep it out of Git. For a brand-new empty restaurant only, initialize the
schema once and use `INITIAL_MANAGER_PASSWORD`. For an existing restaurant,
restore the production dump before starting the app and never seed another
manager account.

Start or update the stack from the repository root:

```bash
docker compose --env-file .env.hostinger \
  -f docker-compose.hostinger.yml up -d --build
```

The public health endpoint is `/api/health`. PostgreSQL is bound only to VPS
loopback for SSH-tunnel maintenance and must not be opened in the firewall.

## 2. Frontend on Vercel

Build from `client/` with `npm run build`. Set these build-time variables:

```text
REACT_APP_API_URL=https://api.foodzone.com.np
REACT_APP_SOCKET_URL=https://api.foodzone.com.np
```

Preserve `REACT_APP_GOOGLE_MAPS_API_KEY` if Maps is enabled. Do not use the
legacy client-side `REACT_APP_ADMIN_PASSWORD`; authentication belongs on the
backend and secrets must never be embedded in a React build.

Point the frontend domain at Vercel and the API hostname at the Hostinger VPS.
Include every Vercel production/preview origin that should be allowed in the
backend `ALLOWED_ORIGINS` value.

## 3. Restaurant onboarding

1. `/admin` → log in as Manager → change any initial password, then remove
   `INITIAL_MANAGER_PASSWORD` from the environment.
2. Settings → Business: name, logo, colors, phone, address, currency, VAT,
   service charge, and operating hours.
3. Settings → Integrations: upload eSewa, Khalti, and FonePay QR images.
4. Settings → Notifications: notification email and per-order-type toggles;
   send a test email.
5. Admin → Staff: create Cashier, Chef, Waiter, and Kitchen Helper accounts.
6. Admin → Menu: enter or import the menu.
7. Settings → Tables: set table count and print table QR codes.

## 4. Station PWAs

Install the PWA from the page used by each device:

| Station | Install from |
|---|---|
| Cashier counter | `/pos` |
| Reception desk | `/reception` |
| Kitchen display | `/kitchen-tv` |
| Manager phone/desktop | `/admin` |
| Waiter phones | `/staff` |

On each device, tap **Enable sound** once and allow browser notifications.

## 5. Smoke test

- Scan a table QR, place one test order, and confirm it appears exactly once.
- Confirm the kitchen, reception, staff, and admin views update immediately.
- Confirm the table and delivery sounds are loud and distinct.
- Complete a POS takeaway sale, print its receipt/KOT, and verify reports.
- Upload and view a payment receipt and each payment QR image.
- Send a test email.
- Confirm `GET https://api.foodzone.com.np/api/health` succeeds.

## 6. Backups and updates

Keep encrypted PostgreSQL dumps and upload archives outside the VPS in addition
to Hostinger VPS snapshots. Never rely on one disk or one provider as the only
copy. Before an application update, take a backup, fast-forward the repository,
and rebuild only the app service. Named database and upload volumes remain
independent of the application image.
