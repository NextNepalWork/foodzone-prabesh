# Food Zone — Restaurant Management System

A production-ready, white-label restaurant platform: QR-code table ordering for customers, a counter-sale POS, kitchen displays, reception desk, daybook/cash management, reports & P&L, and a full admin console — with real-time updates, push notifications, and installable PWAs for every station.

**Stack:** React (CRA, Tailwind) · Express 4 · PostgreSQL · Socket.IO · web-push · nodemailer

## Surfaces

| Route | Who | What |
|---|---|---|
| `/` , `/menu`, `/:tableId` | Customers | Landing page, menu browsing, QR table ordering |
| `/delivery-cart` | Customers | Delivery ordering |
| `/pos` | Cashier / Manager | Counter-sale POS: item grid, cart, discounts, cash/card/QR payment with change calculation, receipt + KOT printing, daybook |
| `/reception` | Cashier / Manager | Active orders, table map, payments, day close |
| `/kitchen-tv` | Chef / Kitchen Helper | Live kitchen order board (touch screen) |
| `/staff` | Chef / Waiter | Staff dashboard |
| `/admin` | Manager | Orders, menu, inventory, reports & P&L, staff, settings (responsive: mobile admin on phones) |

Each staff surface is separately installable as a PWA — install the app **from the page you want it to open on** (e.g. install from `/pos` and the app always starts at the POS).

## Quick start (local)

```bash
# 1. Database
docker-compose up -d           # or any local PostgreSQL
psql <your-db> -f create-all-tables.sql

# 2. Backend (port 3000)
cd server
cp .env.example .env           # set DATABASE_URL/DB_*, JWT_SECRET, INITIAL_MANAGER_PASSWORD
npm install
npm run dev

# 3. Frontend (port 3001; CRA proxy targets :3000)
cd ../client
npm install
PORT=3001 npm start
```

Log in at `http://localhost:3001/admin` with the account seeded from `INITIAL_MANAGER_USERNAME` / `INITIAL_MANAGER_PASSWORD`.

## Environment variables (server)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` (or `DB_HOST/PORT/NAME/USER/PASSWORD`) | ✅ prod | PostgreSQL connection |
| `JWT_SECRET` | ✅ prod | Token signing — server refuses to boot in production without it |
| `INITIAL_MANAGER_USERNAME` / `INITIAL_MANAGER_PASSWORD` | first boot | Seeds the first Manager account when the staff table is empty |
| `ALLOWED_ORIGINS` | ✅ prod | Comma-separated browser origins (your restaurant's domain(s)) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | for push | Web-push notifications (`npx web-push generate-vapid-keys`) |
| `SMTP_HOST/PORT/SECURE/USER/PASS`, `EMAIL_FROM` | for email | Order/booking email notifications (e.g. Hostinger SMTP) |
| `PORT`, `NODE_ENV` | – | Defaults: `3000`, `development` |

Client build-time: `REACT_APP_API_URL`, `REACT_APP_SOCKET_URL` → your backend URL.

See [server/.env.example](server/.env.example) for the full annotated list, and [DEPLOYMENT.md](DEPLOYMENT.md) for the per-restaurant deployment runbook (Railway + Netlify/Vercel).

## ⚠️ Security note for existing deployments

Older revisions of this repository committed real credentials (`.env.production`, `server/.env.artisanweave`, `raw/server/.env`, `server/database/env*`). They have been removed from the tree, **but they remain in git history — rotate all of them**: the PostgreSQL password / `DATABASE_URL`, `JWT_SECRET`, admin & staff passwords, SMTP password, and VAPID keys.

## White-label checklist (new restaurant)

1. Deploy backend + PostgreSQL, set env vars (see DEPLOYMENT.md).
2. Deploy frontend with `REACT_APP_API_URL` pointing at the backend; add the domain to `ALLOWED_ORIGINS`.
3. Log in to `/admin` → **Settings**: business name, logo, colors, phone, address, currency, tax, operating hours.
4. Upload payment QR codes (eSewa/Khalti/FonePay) in Settings → Integrations.
5. Create staff accounts (Manager, Cashier, Chef, Waiter) in Admin → Staff.
6. Import/enter the menu (Admin → Menu; CSV import script in `server/scripts/`).
7. Print table QR codes (Settings → Tables) and place them on tables.
8. On each station device, open its page and install the PWA (`/pos`, `/kitchen-tv`, `/reception`, `/admin`), then tap "Enable sound".
