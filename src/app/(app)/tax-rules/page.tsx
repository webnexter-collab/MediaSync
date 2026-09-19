import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { taxRules } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

const CATEGORY_LABEL: Record<string, string> = {
  standard: "Standard",
  zero_rated: "Zero-rated",
  exempt: "Exempt",
  reverse_charge: "Reverse charge",
  out_of_scope: "Out of scope",
};

export default async function TaxRulesPage() {
  let rows: (typeof taxRules.$inferSelect)[] = [];
  let dbError = false;
  try {
    rows = await db
      .select()
      .from(taxRules)
      .where(eq(taxRules.companyId, COMPANY_ID))
      .orderBy(asc(taxRules.country), asc(taxRules.name));
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Tax rules"
        subtitle="Rates by jurisdiction and category. One rule is the default."
        action={<LinkButton href="/tax-rules/new">New tax rule</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
        ) : rows.length === 0 ? (
          <EmptyState title="No tax rules yet" hint="Add your first tax rule." action={<LinkButton href="/tax-rules/new">New tax rule</LinkButton>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Country</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 text-right font-medium">Rate</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <Link href={`/tax-rules/${r.id}/edit`} className="font-medium text-ink hover:text-teal-ink">
                      {r.name}
                    </Link>{" "}
                    {r.isDefault && <Badge tone="good">Default</Badge>}
                  </td>
                  <td className="px-5 py-3 tnum text-muted">{r.country}</td>
                  <td className="px-5 py-3">{CATEGORY_LABEL[r.category] ?? r.category}</td>
                  <td className="px-5 py-3 text-right tnum">{Number(r.ratePct)}%</td>
                  <td className="px-5 py-3">
                    {r.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
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
