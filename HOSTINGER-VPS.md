# MediaSync — Go-Live on Hostinger VPS (KVM2)

**Hosting strategy**
- **Demo (now):** Vercel + Neon Postgres — current setup, auto-deploys from `main`. No change.
- **Live (this doc):** Hostinger VPS (KVM2) running **Node + PM2 + self-hosted PostgreSQL**, behind nginx with Let's Encrypt SSL. Keeps all data on a server in a region you choose (UAE/EU) for data residency.

Target stack on the VPS: Ubuntu 22.04/24.04 · Node 20 LTS · PostgreSQL 16 · nginx (reverse proxy + TLS) · PM2 (process manager).

---

## 0. The one code change before self-hosting Postgres ⚠️

The app talks to the DB through Neon's **serverless (WebSocket) driver**, which only connects to Neon — **not** to a normal PostgreSQL server. To run Postgres on the VPS you must switch to the standard `node-postgres` driver. (If you'd rather keep the database on Neon and only move the *app* to the VPS, skip this section — no code change needed.)

1. Add the driver, remove the Neon-only ones when fully migrated:
   ```bash
   npm install pg
   npm install -D @types/pg
   ```
2. Replace `src/db/index.ts` with the node-postgres version:
   ```ts
   import { Pool } from "pg";
   import { drizzle } from "drizzle-orm/node-postgres";
   import * as schema from "./schema";

   const globalForDb = globalThis as unknown as { pool?: Pool };
   export const pool =
     globalForDb.pool ??
     new Pool({
       connectionString: process.env.DATABASE_URL,
       // Local VPS Postgres: no SSL. Managed/remote PG: ssl: { rejectUnauthorized: false }
       ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
     });
   if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

   export const db = drizzle(pool, { schema });
   export type DB = typeof db;
   export { schema };
   ```
   `db.transaction(...)` (used for gap-free numbering) works the same on `node-postgres`.
3. The custom migration runner scripts that used `@neondatabase/serverless` can then use `pg` instead; or simply run `drizzle-kit migrate` directly, which now works because the VPS Postgres is reachable on port 5432.
4. Do this on a branch, test against a local Postgres, then merge. **Keep the demo on Neon until the VPS is verified.**

---

## 1. Provision & base-secure the VPS
```bash
# as root, first login
adduser deploy && usermod -aG sudo deploy
# SSH key auth only; then:
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
sudo apt update && sudo apt -y upgrade
sudo apt -y install ufw fail2ban
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

## 2. Install Node 20, PostgreSQL 16, nginx, PM2
```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt -y install nodejs
# PostgreSQL 16
sudo apt -y install postgresql postgresql-contrib
# nginx + certbot
sudo apt -y install nginx certbot python3-certbot-nginx
# PM2
sudo npm install -g pm2
```

## 3. Create the database
```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE mediasync WITH LOGIN PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE mediasync OWNER mediasync;
SQL
```
Connection string: `postgresql://mediasync:CHANGE_ME_STRONG@localhost:5432/mediasync`

## 4. Migrate data from Neon → VPS Postgres
```bash
# From a machine with the Neon URL (dump schema+data):
pg_dump "postgresql://USER:PASS@NEON_HOST/DB?sslmode=require" \
  --no-owner --no-privileges -Fc -f mediasync.dump
# Copy to the VPS, then restore:
pg_restore --no-owner --no-privileges -d \
  "postgresql://mediasync:CHANGE_ME_STRONG@localhost:5432/mediasync" mediasync.dump
```
(Alternatively start clean: `npm run db:migrate` then `npm run db:seed`.)

## 5. Deploy the app
```bash
cd /home/deploy
git clone https://github.com/webnexter-collab/MediaSync.git app && cd app
npm ci
cat > .env <<'ENV'
DATABASE_URL=postgresql://mediasync:CHANGE_ME_STRONG@localhost:5432/mediasync
AUTH_SECRET=<generate: openssl rand -base64 48>
NODE_ENV=production
ENV
npm run build
pm2 start "npm run start -- -p 3000" --name mediasync
pm2 save && pm2 startup   # run the printed command once to survive reboots
```

## 6. nginx reverse proxy + SSL
```nginx
# /etc/nginx/sites-available/mediasync
server {
  server_name app.mindsetmedia.ae;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  client_max_body_size 5m;   # allows PDF/Excel + uploads
}
```
```bash
sudo ln -s /etc/nginx/sites-available/mediasync /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.mindsetmedia.ae   # auto-renews
```
Point the domain's A record to the VPS IP first.

## 7. Updates (each release)
```bash
cd /home/deploy/app && git pull
npm ci && npm run build
npm run db:migrate         # apply any new migrations
pm2 reload mediasync
```

## 8. Backups & monitoring
- **Daily DB backup** (cron): `pg_dump ... -Fc -f /backups/mediasync-$(date +\%F).dump` + off-site copy (e.g. Hostinger backups / S3-compatible). Keep 14–30 days.
- `pm2 logs mediasync` for app logs; enable `pm2 install pm2-logrotate`.
- Hostinger weekly VPS snapshots on.

## 9. Fallback
If anything blocks the self-hosted DB, the fastest safe live option is **app on the VPS + database still on Neon**: skip §0 and §3–4, set `DATABASE_URL` to the Neon URL in §5. You keep managed Postgres and only move compute. Revisit self-hosting later.

## Cost (indicative)
Hostinger KVM2 ≈ **USD 7–15/mo** (2 vCPU / 8 GB / 100 GB). Domain + Let's Encrypt SSL free. No per-seat fees. One VPS comfortably runs MediaSync for a single company.
