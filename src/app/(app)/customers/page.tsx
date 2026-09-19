import Link from "next/link";
import { desc, ilike, or, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let rows: (typeof customers.$inferSelect)[] = [];
  let dbError = false;
  try {
    const where = q
      ? and(
          eq(customers.companyId, COMPANY_ID),
          or(ilike(customers.name, `%${q}%`), ilike(customers.code, `%${q}%`)),
        )
      : eq(customers.companyId, COMPANY_ID);
    rows = await db
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.createdAt))
      .limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Your customer directory with TRN, terms and balances."
        action={<LinkButton href="/customers/new">New customer</LinkButton>}
      />

      <form className="mb-4" action="/customers">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or code…"
          className="field h-10 w-72 rounded-lg border border-line-2 bg-surface px-3 text-sm"
        />
      </form>

      <Card>
        {dbError ? (
          <EmptyState
            title="Database not connected yet"
            hint="Set DATABASE_URL and run the migrations, then refresh. See the README for the Neon setup steps."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title={q ? "No matches" : "No customers yet"}
            hint={q ? "Try a different search." : "Add your first customer to get started."}
            action={!q ? <LinkButton href="/customers/new">New customer</LinkButton> : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">TRN</th>
                <th className="px-5 py-3 font-medium">Terms</th>
                <th className="px-5 py-3 text-right font-medium">Credit limit</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-line last:border-0 hover:bg-bg"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/customers/${c.id}/edit`}
                      className="font-medium text-ink hover:text-teal-ink"
                    >
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{c.name}</td>
                  <td className="px-5 py-3 tnum text-muted">{c.trn ?? "—"}</td>
                  <td className="px-5 py-3 tnum text-muted">
                    {c.paymentTermsDays ? `${c.paymentTermsDays}d` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tnum">
                    {formatFils(c.creditLimitFils ?? 0, { withSymbol: false })}
                  </td>
                  <td className="px-5 py-3">
                    {c.isActive ? (
                      <Badge tone="good">Active</Badge>
                    ) : (
                      <Badge tone="muted">Inactive</Badge>
                    )}
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
