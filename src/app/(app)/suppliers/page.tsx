import Link from "next/link";
import { desc, ilike, or, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let rows: (typeof suppliers.$inferSelect)[] = [];
  let dbError = false;
  try {
    const where = q
      ? and(
          eq(suppliers.companyId, COMPANY_ID),
          or(ilike(suppliers.name, `%${q}%`), ilike(suppliers.code, `%${q}%`)),
        )
      : eq(suppliers.companyId, COMPANY_ID);
    rows = await db
      .select()
      .from(suppliers)
      .where(where)
      .orderBy(desc(suppliers.createdAt))
      .limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Publishers"
        subtitle="Media owners, publications, stations and networks you book with."
        action={<LinkButton href="/suppliers/new">New publisher</LinkButton>}
      />

      <form className="mb-4" action="/suppliers">
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
            title={q ? "No matches" : "No suppliers yet"}
            hint={q ? "Try a different search." : "Add your first supplier to get started."}
            action={!q ? <LinkButton href="/suppliers/new">New supplier</LinkButton> : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">TRN</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Terms</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-line last:border-0 hover:bg-bg"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/suppliers/${s.id}/edit`}
                      className="font-medium text-ink hover:text-teal-ink"
                    >
                      {s.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{s.name}</td>
                  <td className="px-5 py-3 tnum text-muted">{s.trn ?? "—"}</td>
                  <td className="px-5 py-3 text-muted">{s.contactPerson ?? "—"}</td>
                  <td className="px-5 py-3 tnum text-muted">
                    {s.paymentTermsDays ? `${s.paymentTermsDays}d` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    {s.isActive ? (
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
