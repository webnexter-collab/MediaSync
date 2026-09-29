import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateCards, rateCardItems } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function RateCardsPage() {
  let rows: (typeof rateCards.$inferSelect & { itemCount: number })[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({
        id: rateCards.id, companyId: rateCards.companyId, name: rateCards.name,
        businessUnitId: rateCards.businessUnitId,
        currency: rateCards.currency, validFrom: rateCards.validFrom, validTo: rateCards.validTo,
        isActive: rateCards.isActive, notes: rateCards.notes, createdAt: rateCards.createdAt,
        itemCount: sql<number>`count(${rateCardItems.id})`.mapWith(Number),
      })
      .from(rateCards)
      .leftJoin(rateCardItems, eq(rateCardItems.rateCardId, rateCards.id))
      .where(eq(rateCards.companyId, COMPANY_ID))
      .groupBy(rateCards.id)
      .orderBy(desc(rateCards.id));
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Rate Cards"
        subtitle="Priced offerings by publisher/media that pre-fill Booking Orders."
        action={<LinkButton href="/rate-cards/new">New rate card</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
        ) : rows.length === 0 ? (
          <EmptyState title="No rate cards yet" hint="Create a rate card, then add priced items." action={<LinkButton href="/rate-cards/new">New rate card</LinkButton>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Currency</th>
                <th className="px-5 py-3 font-medium">Validity</th>
                <th className="px-5 py-3 text-right font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3"><Link href={`/rate-cards/${c.id}`} className="font-medium text-ink hover:text-teal-ink">{c.name}</Link></td>
                  <td className="px-5 py-3 tnum text-muted">{c.currency}</td>
                  <td className="px-5 py-3 tnum text-muted">{c.validFrom ?? "—"}{c.validTo ? ` → ${c.validTo}` : ""}</td>
                  <td className="px-5 py-3 text-right tnum">{c.itemCount}</td>
                  <td className="px-5 py-3">{c.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
