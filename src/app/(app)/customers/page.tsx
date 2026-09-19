import Link from "next/link";
import { desc, ilike, or, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";
import { formatFils } from "@/lib/money";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  direct_client: "Direct client",
  agency: "Agency",
  buying_house: "Buying house",
  advertiser: "Advertiser",
};

const VALID_TYPES = ["direct_client", "agency", "buying_house", "advertiser"] as const;
type AcctType = (typeof VALID_TYPES)[number];

const VIEW_TITLE: Record<string, { title: string; subtitle: string }> = {
  advertiser: { title: "Advertisers", subtitle: "Brands/advertisers you can select on Booking Orders." },
  direct_client: { title: "Clients", subtitle: "Paying clients you can select on Booking Orders." },
  agency: { title: "Agencies", subtitle: "Agencies and buying houses." },
  buying_house: { title: "Buying houses", subtitle: "Buying houses." },
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;
  const activeType = (VALID_TYPES as readonly string[]).includes(type ?? "") ? (type as AcctType) : undefined;
  const view = activeType ? VIEW_TITLE[activeType] : { title: "Accounts", subtitle: "Clients, agencies and buying houses — your CRM directory." };

  let rows: (typeof customers.$inferSelect)[] = [];
  let dbError = false;
  try {
    const conds = [eq(customers.companyId, COMPANY_ID)];
    if (q) conds.push(or(ilike(customers.name, `%${q}%`), ilike(customers.code, `%${q}%`))!);
    if (activeType) conds.push(eq(customers.accountType, activeType));
    rows = await db
      .select()
      .from(customers)
      .where(and(...conds))
      .orderBy(desc(customers.createdAt))
      .limit(200);
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title={view.title}
        subtitle={view.subtitle}
        action={<LinkButton href="/customers/new">New account</LinkButton>}
      />

      <form className="mb-4" action="/customers">
        {activeType && <input type="hidden" name="type" value={activeType} />}
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
            title={q ? "No matches" : "No accounts yet"}
            hint={q ? "Try a different search." : "Add your first account to get started."}
            action={!q ? <LinkButton href="/customers/new">New account</LinkButton> : undefined}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
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
                  <td className="px-5 py-3">
                    <Badge tone={c.accountType === "direct_client" ? "muted" : "neutral"}>
                      {ACCOUNT_TYPE_LABEL[c.accountType] ?? c.accountType}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 tnum text-muted">
                    {c.paymentTermsDays ? `${c.paymentTermsDays}d` : "—"}
                  </td>
                  <td className="px-5 py-3 text-right tnum">
                    {formatFils(c.creditLimitFils ?? 0, { withSymbol: false, currency: c.currency })}
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
