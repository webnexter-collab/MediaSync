# Deploying MediaSync to Vercel (quick web access)

Vercel hosts this app (Next.js 15 + Neon) with zero config. It connects to the
same Neon database you've been using, so your data + logins carry over.
This is a convenient web preview; production still targets Hostinger KVM2 (see HOSTINGER.md).

You run these — the login is browser-based, so it must be you.

## 1. Log in
```bash
cd /d/MediaSync
npx vercel login
```

## 2. First deploy (creates the project + a preview URL)
```bash
npx vercel
```
Accept the defaults (scope = your account, link to new project "mediasync",
framework auto-detected as Next.js). It builds and gives you a preview URL.
The app won't work yet until env vars are set (step 3).

## 3. Add environment variables
Two secrets are required — copy their values from `D:\MediaSync\.env`:
- `DATABASE_URL` — the Neon connection string
- `AUTH_SECRET` — the long random string

Easiest via the dashboard: Vercel → your project → **Settings → Environment
Variables** → add both for **Production** and **Preview**.

Or via CLI (it prompts for the value + environments):
```bash
npx vercel env add DATABASE_URL production
```
```bash
npx vercel env add AUTH_SECRET production
```
(Repeat for the `preview` environment if you want the preview URLs to work too.)

## 4. Deploy to production
```bash
npx vercel --prod
```
This prints your public URL (e.g. `https://mediasync.vercel.app`). Open it and
log in with `admin@mindsetmedia.ae` / `admin123`.

## Redeploying after changes
```bash
npx vercel --prod
```

## Notes
- Uses the **same Neon DB** as local — you'll see the sample data (BO-MS-1001,
  the rate card, etc.). Say the word if you want it cleared first.
- Keep `.env` out of git (it already is) — secrets live only in Vercel's env store.
- `server.js` (for Hostinger) is ignored by Vercel; harmless.
