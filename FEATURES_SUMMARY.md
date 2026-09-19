# BizDocs Suite — Feature Summary (v0.6)

A UAE VAT-compliant billing and business-documents web app.

## Access & users (new in v0.6)
- Login required for the entire app (middleware-enforced); standalone /login page.
- Signed JWT session cookie (httpOnly); bcrypt-hashed passwords.
- Three roles: **Administrator** (all rights + user management), **User** (create/edit), **Demo user** (view only).
- Admin user management at /admin/users: create/delete users; safeguards against deleting yourself or the last admin.
- Demo restrictions — enforced server-side: no saving, no PDF generation.
- Demo deterrents — client-side (not a security boundary): moving watermark (email + time), copy/right-click blocking, blur-on-focus-loss, hidden write buttons. Screenshots cannot be prevented in a browser.

## Sales
- Quotations, Invoices, Delivery Notes, Receipts — with VAT, PDFs, and settlement.

## Purchasing
- Purchase Orders and Supplier Payments — mirror of the sales side.

## Masters
- Customers, Suppliers, Items, and Bank & Cash Accounts.

## Bank, Cash & Credit Cards (new in v0.6)
- Credit card account type with credit limit, last-4, statement/due day.
- Cards treated as a liability: outstanding, utilisation, available credit = limit − outstanding.
- Cards excluded from cash position; separate "Card outstanding" total.

## Reports
- Aged Receivables, Aged Payables.
- Customer & Supplier Statements (Unpaid documents + Transactions with running balance).

## Dashboard
- Receivables, Payables, Cash position, Overdue tiles; aging chart; cash-by-account donut; recent documents; quick actions.

## Technical
- Next.js 15 App Router + Server Actions, Drizzle ORM, Neon Postgres, Vercel.
- Money stored as integer fils; VAT computed per line; gap-free numbering (INV/QUO/DN/RCP/PO/PAY).
- PDFs via @react-pdf/renderer on the Node runtime.
- Auth: jose (JWT) + bcryptjs.

## Deployment notes
- Run migration drizzle/0002_auth_and_credit_cards.sql in Neon.
- Set AUTH_SECRET env var in Vercel (long random string).
- Seeded logins (CHANGE THESE): admin@bizdocs.local/admin123, user@bizdocs.local/user123, demo@bizdocs.local/demo123.
