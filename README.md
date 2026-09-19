# MediaSync

Quotations, invoicing & business documents for UAE business.
Next.js 15 · React 19 · Tailwind v4 · Drizzle ORM · Neon Postgres · Vercel.

## What's in this build (v0.1 — foundation)

- **Money core** — all amounts in integer fils, with `toFils` / `formatFils` helpers.
- **VAT engine** — per-line VAT (standard / zero-rated / exempt / reverse-charge).
- **Gap-free numbering** — transactional sequence allocator, ready for the documents engine.
- **Customer master** — list, search, create, edit, activate/deactivate.
- **Supplier master** — same.
- **App shell** — sidebar nav, dashboard, refined navy/teal design system.

Documents (quotations, invoices, delivery notes, POs) and receipts/payments are
scaffolded in the nav and reuse these same patterns — they come next.

## Local setup

```bash
npm install
cp .env.example .env        # then paste your Neon connection string
npm run db:generate         # generate SQL migration from the schema
npm run db:migrate          # apply it to Neon
npm run db:seed             # optional sample data (company + a few masters)
npm run dev                 # http://localhost:3000
```

## Applying the schema when port 5432 is blocked

If your office network can't reach Neon on 5432, use any of these instead of
`db:migrate` locally:

1. **Vercel** — the schema is applied by a GitHub Action / build step (below),
   so a normal deploy migrates the database.
2. **Phone hotspot** — run `npm run db:migrate` once from an unrestricted network.
3. **Neon SQL editor** — paste the generated file from `drizzle/` into the Neon
   console and run it.

### GitHub Action (recommended)

Add `DATABASE_URL` to your repo secrets, then create
`.github/workflows/migrate.yml`:

```yaml
name: DB migrate
on:
  push:
    branches: [main]
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Deploy to Vercel

1. Push to GitHub, import the repo in Vercel.
2. Set `DATABASE_URL` in Vercel project env vars (use the **pooled** Neon URL).
3. Deploy. The migrate action keeps the schema in sync on each push to `main`.

## Project structure

```
src/
  app/            routes (dashboard, customers, suppliers)
  actions/        server actions (create/update masters)
  components/     nav, ui primitives, master form
  db/             schema, client, seed
  lib/            money, vat, numbering, validators, form fields
```

## Conventions

- **Money:** integer fils everywhere. Never floats. Format only in the UI.
- **Company scope:** v1 is single-company (`COMPANY_ID = 1`). The schema is already
  multi-tenant; swap the constant for the authenticated user's company when auth lands.
- **Numbering:** always call `nextNumber(tx, …)` inside the document's insert
  transaction so failures don't burn a number.
