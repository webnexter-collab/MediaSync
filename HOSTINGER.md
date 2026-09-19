# Deploying MediaSync on Hostinger

MediaSync is a Next.js 15 (App Router + Server Actions) app that needs a live
Node.js process and a Postgres database. The database is **Neon** (external), so
it does not live on Hostinger — Hostinger only runs the Node app and connects out
to Neon over the network.

There are two hosting tiers. Start on shared, upgrade to VPS when it feels slow.
**The same repo runs on both** — only the run environment changes.

---

## Prerequisites (both tiers)

- Node.js 20+ (Next 15 requires 18.18+; use 20 LTS).
- A Neon Postgres database created for MediaSync (separate from BizDocs).
- Environment variables set (never commit `.env`):
  - `DATABASE_URL` — Neon pooled connection string, ending in `?sslmode=require`
  - `AUTH_SECRET` — long random string
  - `NODE_ENV=production`
- Apply the schema to Neon once: paste the SQL from `drizzle/` into the Neon SQL
  Editor (Hostinger, like the office network, may block Postgres port 5432, so
  `drizzle-kit migrate` over the wire can fail — the SQL Editor always works).
- Optionally seed an admin user: `npm run db:seed` (needs the DB reachable).

---

## Option A — Shared hosting ("Node.js App" / Passenger)

Hostinger's shared plans expose a **Setup Node.js App** tool (hPanel → Advanced →
Node.js). It runs the app under Phusion Passenger using `server.js` as the entry.

1. Upload the project (Git deploy or File Manager). Do **not** upload
   `node_modules` or `.next` — they are rebuilt on the server.
2. In hPanel → **Setup Node.js App**:
   - Application root: the folder you uploaded to
   - Application startup file: `server.js`
   - Node version: 20
3. Add the environment variables (`DATABASE_URL`, `AUTH_SECRET`, `NODE_ENV=production`)
   in the same panel.
4. Open the app's terminal (or SSH) in the application root and run:
   ```bash
   npm install
   npm run build
   ```
5. Click **Restart** in the Node.js App panel. Passenger runs `server.js` and
   passes it the port automatically.

**Shared-hosting caveats**
- Passenger may idle/kill the process under low traffic; the first request after
  idle is slow (cold start). Fine for light internal use.
- Memory/CPU are limited — `npm run build` can be slow or run out of memory on
  the smallest plans. If the build fails on the server, build locally and upload
  the `.next` folder instead of building on the server.
- No guaranteed always-on worker; avoid long-running background jobs.

---

## Option B — VPS / Cloud (recommended once traffic grows)

Full control, `next start`-class performance, no cold starts.

1. SSH in. Install Node 20 (e.g. via `nvm`) and `pm2` (`npm i -g pm2`).
2. Clone/upload the repo, then:
   ```bash
   npm install
   npm run build
   ```
3. Set env vars (export them, or use a `.env` + a process manager that loads it).
4. Start under PM2 using the same entrypoint:
   ```bash
   NODE_ENV=production PORT=3000 pm2 start server.js --name mediasync
   pm2 save
   pm2 startup   # follow the printed command so it survives reboots
   ```
5. Put Nginx (or Hostinger's proxy) in front, terminating TLS and proxying to
   `http://127.0.0.1:3000`.

---

## Migrating shared → VPS later

Because the database is external (Neon) and the entrypoint is the same
(`server.js`), migration is just: provision the VPS, pull the same repo, set the
same env vars, `npm install && npm run build`, start under PM2, point DNS at the
VPS. No code changes, no data migration.

---

## Updating a deployed instance

```bash
git pull            # or re-upload changed files
npm install         # only if dependencies changed
npm run build
# shared: click Restart in the Node.js App panel
# VPS:    pm2 restart mediasync
```

If `src/db/schema.ts` changed: run `npm run db:generate` locally, commit the new
`drizzle/NNNN_*.sql`, and paste it into the Neon SQL Editor before restarting.
