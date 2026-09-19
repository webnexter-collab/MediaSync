import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { currencies, fxRates, companies } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function CurrenciesPage() {
  let rows: (typeof currencies.$inferSelect)[] = [];
  let latestByCode: Record<string, string> = {};
  let baseCurrency = "AED";
  let dbError = false;
  try {
    rows = await db
      .select()
      .from(currencies)
      .where(eq(currencies.companyId, COMPANY_ID))
      .orderBy(asc(currencies.code));

    const rates = await db
      .select({ code: fxRates.currencyCode, rate: fxRates.rateToBase, asOf: fxRates.asOfDate })
      .from(fxRates)
      .where(eq(fxRates.companyId, COMPANY_ID))
      .orderBy(desc(fxRates.asOfDate), desc(fxRates.id));
    for (const r of rates) if (!(r.code in latestByCode)) latestByCode[r.code] = r.rate;

    const [co] = await db.select({ base: companies.baseCurrency }).from(companies).where(eq(companies.id, COMPANY_ID)).limit(1);
    if (co?.base) baseCurrency = co.base;
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Currencies & FX"
        subtitle={`Currencies you transact in. Base currency is ${baseCurrency}.`}
        action={<LinkButton href="/currencies/new">New currency</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
        ) : rows.length === 0 ? (
          <EmptyState title="No currencies yet" hint="Add your first currency." action={<LinkButton href="/currencies/new">New currency</LinkButton>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Symbol</th>
                <th className="px-5 py-3 text-right font-medium">Rate → {baseCurrency}</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <Link href={`/currencies/${c.id}/edit`} className="font-medium text-ink hover:text-teal-ink">
                      {c.code}
                    </Link>{" "}
                    {c.code === baseCurrency && <Badge tone="neutral">Base</Badge>}
                  </td>
                  <td className="px-5 py-3">{c.name}</td>
                  <td className="px-5 py-3 text-muted">{c.symbol ?? "—"}</td>
                  <td className="px-5 py-3 text-right tnum">{latestByCode[c.code] ? Number(latestByCode[c.code]) : "—"}</td>
                  <td className="px-5 py-3">
                    {c.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
