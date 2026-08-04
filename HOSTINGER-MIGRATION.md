# Food Zone migration to Hostinger

This runbook moves the Food Zone Express backend, PostgreSQL 18 database, and
uploaded payment images from Railway to a Hostinger VPS. The React/PWA frontend
can remain on Vercel. The recommended target is a Hostinger VPS because this
application uses PostgreSQL, Socket.IO, background timers, push notifications,
and persistent local uploads.

## Safety rules

- Keep Railway and Vercel unchanged until Hostinger passes every smoke test.
- Never commit `.env.hostinger`, database dumps, receipts, or customer data.
- Restore into a new, empty PostgreSQL volume before starting the app.
- Preserve `JWT_SECRET` and the complete VAPID key pair during the move.
- Freeze new orders for the final export so no order is left behind.
- Do not delete Railway until the Hostinger service has been stable and both
  migration backups have been stored securely.

## 1. Provision the Hostinger VPS

Choose Hostinger **VPS hosting** with the Ubuntu 24.04 Docker template. A
practical starting point for this single restaurant is at least 2 vCPU, 4 GB
RAM, and enough disk for database growth, Docker images, logs, and backups.

In hPanel:

1. Create the VPS and record its public IPv4 address.
2. Allow inbound SSH, HTTP, and HTTPS: TCP 22, 80, and 443. Do not expose
   PostgreSQL port 5432 publicly.
3. Create an A record for `api.foodzone.com.np` pointing to the VPS. A low DNS
   TTL such as 300 seconds makes the final cutover easier.
4. Confirm Docker and Docker Compose are installed on the VPS.

## 2. Put the application on the VPS

Clone the GitHub repository into `/opt/foodzone` and check out the exact
production commit. From that directory:

```bash
cp hostinger.env.example .env.hostinger
chmod 600 .env.hostinger
```

Fill in `.env.hostinger` using values copied securely from Railway. Do not paste
secrets into Git, chat, screenshots, or shell history. Required values include:

- a new strong `POSTGRES_PASSWORD` for the Hostinger database;
- the existing `JWT_SECRET`, `JWT_EXPIRES_IN`, and `ALLOWED_ORIGINS`;
- the existing `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`;
- SMTP settings if email notifications are enabled;
- `API_DOMAIN=api.foodzone.com.np` and a valid `TLS_EMAIL`.

Do not set `INITIAL_MANAGER_PASSWORD` when restoring the existing staff table.
Do not copy Railway's `DATABASE_URL`; Compose deliberately forces the app to
use its private Hostinger PostgreSQL service.
Run the preflight and resolve every failure:

```bash
./scripts/hostinger-migration/preflight.sh
```

## 3. Export Railway safely

The old Railway PostgreSQL service must be running long enough to make the
export. Starting or redeploying only that database service is safe when its
existing volume remains mounted at `/var/lib/postgresql/data`; the old web
service does not need to be started.

From a trusted workstation linked to the old Railway project:

```bash
railway run --service Postgres \
  ./scripts/hostinger-migration/export-railway-database.sh
./scripts/hostinger-migration/backup-uploads.sh
```

The export uses PostgreSQL 18 tools. If the workstation client is older and
Docker is available, the script automatically uses the official PostgreSQL 18
container. It creates a compressed dump and SHA-256 checksum in the ignored
`migration-backups/` directory.

If the authoritative uploaded files exist only on Railway, archive
`/app/server/uploads` through Railway SSH and download the archive. The local
upload archive is useful only if it contains the latest production files.

Take a Railway-native database backup as a second recovery point.

## 4. Copy and restore data before app startup

Securely copy the verified database dump, its `.sha256` file, the uploads
archive, and its checksum into `/opt/foodzone/migration-backups/` on the VPS.
Then start only PostgreSQL:

```bash
docker compose --env-file .env.hostinger \
  -f docker-compose.hostinger.yml up -d db
```

Restore into the guarded empty database:

```bash
./scripts/hostinger-migration/restore-database-on-hostinger.sh \
  migration-backups/foodzone-YYYYMMDDTHHMMSSZ.dump
```

Restore uploads into their separate persistent volume:

```bash
./scripts/hostinger-migration/restore-uploads-on-hostinger.sh \
  migration-backups/foodzone-uploads-YYYYMMDDTHHMMSSZ.tar.gz
```

Both scripts verify checksums when present and refuse to overwrite non-empty
targets.

## 5. Verify the restored database

The Compose file binds PostgreSQL only to VPS loopback. From the workstation,
open an SSH tunnel:

```bash
ssh -N -L 55432:127.0.0.1:5432 root@HOSTINGER_VPS_IP
```

In a second terminal, set `OLD_DATABASE_URL` to Railway and
`NEW_DATABASE_URL` to the URL-encoded Hostinger credentials through
`localhost:55432`, then run:

```bash
node scripts/hostinger-migration/verify-databases.js
```

The verifier is read-only. It compares all public tables, column definitions,
and row counts without printing customer data. Every table must report
`MATCH`. Close the SSH tunnel after verification.

## 6. Start Hostinger on a temporary hostname

For the safest test, first set `API_DOMAIN` to a temporary hostname whose A
record already points to the VPS. Then build and start the app and Caddy:

```bash
docker compose --env-file .env.hostinger \
  -f docker-compose.hostinger.yml up -d --build app caddy
docker compose --env-file .env.hostinger \
  -f docker-compose.hostinger.yml ps
```

Caddy obtains and renews HTTPS certificates automatically. It also proxies
Socket.IO WebSocket and polling traffic. PostgreSQL and uploads live in named
volumes and are not replaced by application redeployments.

Run the read-only checks:

```bash
BACKEND_URL=https://temporary-api-hostname.example.com \
  ./scripts/hostinger-migration/smoke-test.sh
```

Then manually verify manager/staff login, Admin Orders, Menu, Settings,
Reports, Daybook, kitchen/reception realtime updates, push and sound alerts,
payment QR images, receipt upload/viewing, and email.

## 7. Final cutover

1. Announce a short order freeze.
2. Make a fresh final Railway database dump and uploads archive.
3. Restore into a fresh empty Hostinger database/uploads volume and rerun the
   database comparison.
4. Set Hostinger `API_DOMAIN=api.foodzone.com.np`.
5. Point the DNS A record for `api.foodzone.com.np` to the Hostinger VPS.
6. Start/reload the Hostinger Compose stack and wait for valid HTTPS.
7. Keep Vercel production variables as:

   ```text
   REACT_APP_API_URL=https://api.foodzone.com.np
   REACT_APP_SOCKET_URL=https://api.foodzone.com.np
   ```

8. Run the smoke test against the final API and Vercel frontend, then place one
   table test order and confirm it appears exactly once.

The Socket.IO client accepts an HTTPS URL; it upgrades to WebSocket itself, so
`https://api.foodzone.com.np` is preferred over a hard-coded `wss://` value.

## 8. Operations and rollback

Create regular Hostinger VPS snapshots plus encrypted PostgreSQL and upload
backups stored off the VPS. Monitor disk space and container health. Deploy a
new app version with a fast-forward Git pull followed by the same Compose
`up -d --build app` command; database and upload volumes remain intact.

If health, login, menu, orders, realtime updates, or uploads fail during
cutover, point the API DNS record back to Railway and keep the Hostinger
volumes unchanged for diagnosis. Do not accept new orders on both systems at
the same time because their databases do not replicate.
