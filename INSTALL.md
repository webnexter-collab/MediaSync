# BizDocs Suite — Installation Guide

A step-by-step guide to get the app running locally and deployed to Vercel.
Written for a **Windows + PowerShell** machine. Total time: ~20–30 minutes.

---

## Part 0 — What you need to install first

Install these once. Accept default options for each.

1. **Node.js 20 LTS** — https://nodejs.org (pick the "LTS" button).
   This gives you `node` and `npm`.
2. **Visual Studio Code** — https://code.visualstudio.com (your code editor).
3. **GitHub Desktop** — https://desktop.github.com (used instead of the git command line).
4. **Accounts** (all have free tiers):
   - GitHub — https://github.com
   - Neon (Postgres database) — https://neon.tech
   - Vercel (hosting) — https://vercel.com

**Verify Node installed** — open PowerShell and run:

```powershell
node -v    # should print v20.x.x (or higher)
npm -v     # should print a version number
```

If `node` isn't recognised, close and reopen PowerShell, or restart the PC.

---

## Part 1 — Get the project onto your machine

1. Unzip `bizdocs-suite-v0.1.zip` to a permanent location, e.g.
   `C:\Projects\bizdocs-suite`.
2. Open the folder in VS Code: **File → Open Folder →** select `bizdocs-suite`.
3. Open the built-in terminal: **Terminal → New Terminal** (it opens in the project
   folder and uses PowerShell).

---

## Part 2 — Install the app's dependencies

In the VS Code terminal:

```powershell
npm install
```

This downloads all the libraries into a `node_modules` folder. It takes a minute
or two. A few `npm warn` lines are normal — only red `error` lines matter.

---

## Part 3 — Create the Neon database

1. Log in to **https://console.neon.tech**.
2. Click **New Project**. Name it `bizdocs`, pick a region close to the UAE
   (e.g. Frankfurt / `eu-central-1`), and create it.
3. On the project dashboard, find **Connection string** and copy the
   **Pooled connection** string. It looks like:

   ```
   postgresql://user:PASSWORD@ep-xxxx-pooler.eu-central-1.aws.neon.tech/bizdocs?sslmode=require
   ```

   Keep this string handy for the next step.

---

## Part 4 — Configure your connection string

1. In the project, copy the example env file. In the terminal:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Open the new `.env` file in VS Code and paste your Neon string:

   ```
   DATABASE_URL="postgresql://user:PASSWORD@ep-xxxx-pooler.eu-central-1.aws.neon.tech/bizdocs?sslmode=require"
   ```

3. Save the file (**Ctrl+S**). The `.env` file is private and is never committed
   to GitHub.

---

## Part 5 — Create the database tables

You need to apply the schema (create the 12 tables) to your Neon database.
**Pick the method that matches your network.**

### Method A — Neon SQL Editor (works on any network, recommended first time)

Your office network blocks the Postgres port (5432), but this method runs in the
browser, so it always works.

1. In VS Code, open `drizzle/0000_init.sql` and copy **all** of it (Ctrl+A, Ctrl+C).
2. In the Neon console, open your project → **SQL Editor**.
3. Paste the whole file and click **Run**.
4. You should see the tables created. Done — skip to Part 6.

### Method B — Run the migration from the command line

Use this from home / a phone hotspot (any network that allows port 5432):

```powershell
npm run db:migrate
```

If it hangs or times out, your network is blocking 5432 — use Method A instead.

### (Optional) Load sample data

To start with a demo company and a few customers/suppliers:

```powershell
npm run db:seed
```

---

## Part 6 — Run the app locally

```powershell
npm run dev
```

When you see `Ready`, open **http://localhost:3000** in your browser.

- Go to **Customers → New customer**, add one, and save.
- Do the same under **Suppliers**.

To stop the app, click in the terminal and press **Ctrl+C**.

> If the Customers page shows "Database not connected yet", re-check your
> `DATABASE_URL` in `.env` and that Part 5 completed successfully.

---

## Part 7 — Put the code on GitHub (via GitHub Desktop)

1. Open **GitHub Desktop → File → Add Local Repository →** choose your
   `bizdocs-suite` folder. If prompted, click **create a repository**.
2. At the bottom left, type a summary like `Initial build` and click
   **Commit to main**.
3. Click **Publish repository** (top right). Untick "Keep this code private" only
   if you want it public — otherwise leave it private. Publish.

Your `.env` is automatically excluded, so your database password is not uploaded.

---

## Part 8 — Deploy to Vercel

1. Log in to **https://vercel.com** with your GitHub account.
2. Click **Add New → Project**, and **Import** your `bizdocs-suite` repository.
3. Before deploying, open **Environment Variables** and add:
   - **Name:** `DATABASE_URL`
   - **Value:** your Neon **pooled** connection string (same as in `.env`)
4. Click **Deploy**. After a minute you'll get a live URL like
   `https://bizdocs-suite.vercel.app`.

---

## Part 9 — Keep the database schema in sync automatically

So you never need port 5432 from the office again, let GitHub apply migrations
for you on every push.

1. In your repo, create the folder/file `.github/workflows/migrate.yml` with:

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

2. On GitHub, open your repo → **Settings → Secrets and variables → Actions →
   New repository secret**. Name it `DATABASE_URL`, paste your Neon string, save.
3. Commit the workflow file (via GitHub Desktop). From now on, whenever you add a
   new migration and push to `main`, GitHub runs it against Neon for you.

---

## Everyday commands (quick reference)

| Task | Command |
|---|---|
| Start the app locally | `npm run dev` |
| Generate a new migration after schema edits | `npm run db:generate` |
| Apply migrations (unrestricted network) | `npm run db:migrate` |
| Load sample data | `npm run db:seed` |
| Build for production (test before deploy) | `npm run build` |

---

## Troubleshooting

- **`node` / `npm` not recognised** — reinstall Node.js LTS and reopen PowerShell.
- **`npm run db:migrate` hangs** — your network blocks port 5432. Use the Neon
  SQL Editor (Part 5, Method A) or a phone hotspot.
- **"Database not connected yet" on a page** — the `DATABASE_URL` in `.env` is
  wrong or the tables aren't created yet. Recheck Parts 4 and 5.
- **Fonts look plain locally** — the app loads Fraunces / IBM Plex Sans from
  Google Fonts; if a network blocks them the layout still works, just with a
  fallback font. It renders correctly once deployed.
- **Vercel build fails on missing `DATABASE_URL`** — add it under the project's
  Environment Variables (Part 8, step 3) and redeploy.
- **Changed the schema?** — run `npm run db:generate` to create a new migration
  file, commit and push; the GitHub Action (Part 9) applies it.
