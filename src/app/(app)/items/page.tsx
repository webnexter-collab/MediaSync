import Link from "next/link";
import { desc, ilike, or, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

const TAX_LABEL: Record<string, string> = {
  standard: "Standard 5%",
  zero_rated: "Zero-rated",
  exempt: "Exempt",
  reverse_charge: "Reverse charge",
  out_of_scope: "Out of scope",
};

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let rows: (typeof items.$inferSelect)[] = [];
  let dbError = false;
  try {
    const where = q
      ? and(
          eq(items.companyId, COMPANY_ID),
          or(ilike(items.name, `%${q}%`), ilike(items.code, `%${q}%`)),
        )
      : eq(items.companyId, COMPANY_ID);
    rows = await db.select().from(items).where(where).orderBy(desc(items.id)).limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle="Products and services you sell — the catalog invoices draw from."
        action={<LinkButton href="/items/new">New item</LinkButton>}
      />
      <form className="mb-4" action="/items">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or code…"
          className="field h-10 w-72 rounded-lg border border-line-2 bg-surface px-3 text-sm"
        />
      </form>
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Set DATABASE_URL and run the migrations, then refresh." />
        ) : rows.length === 0 ? (
          <EmptyState
            title={q ? "No matches" : "No items yet"}
            hint={q ? "Try a different search." : "Add your first product or service."}
            action={!q ? <LinkButton href="/items/new">New item</LinkButton> : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Unit</th>
                <th className="px-5 py-3 text-right font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Tax</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <Link href={`/items/${it.id}/edit`} className="font-medium text-ink hover:text-teal-ink">
                      {it.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{it.name}</td>
                  <td className="px-5 py-3 text-muted">{it.unitOfMeasure}</td>
                  <td className="px-5 py-3 text-right tnum">{formatFils(it.unitPriceFils ?? 0, { withSymbol: false })}</td>
                  <td className="px-5 py-3 text-muted">{TAX_LABEL[it.taxCategory] ?? it.taxCategory}</td>
                  <td className="px-5 py-3">
                    {it.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
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
