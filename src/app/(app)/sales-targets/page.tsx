import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { salespeople, salesTargets, businessUnits } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { saveSalesTargets } from "@/actions/masters";
import { formatFils, toAed } from "@/lib/money";
import { getSession } from "@/lib/auth";
import { isSalesperson, canManageTargets } from "@/lib/session";
import { salespersonIdForEmail } from "@/lib/scope";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const inp = "field h-8 w-full rounded-md border border-line-2 bg-surface px-1.5 text-right text-xs tnum";

export default async function SalesTargetsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const years = [year - 1, year, year + 1];

  const session = await getSession();
  const scoped = isSalesperson(session?.role); // Sales see only their own row
  const readOnly = !canManageTargets(session?.role); // only Admin/Accounts can edit
  const ownId = scoped ? await salespersonIdForEmail(session?.email) : null;

  let sales: (typeof salespeople.$inferSelect & { buName: string | null })[] = [];
  let targets: (typeof salesTargets.$inferSelect)[] = [];
  let dbError = false;
  try {
    const whereSales = scoped
      ? and(eq(salespeople.companyId, COMPANY_ID), eq(salespeople.isActive, true), eq(salespeople.id, ownId ?? -1))
      : and(eq(salespeople.companyId, COMPANY_ID), eq(salespeople.isActive, true));
    [sales, targets] = await Promise.all([
      db
        .select({
          id: salespeople.id, companyId: salespeople.companyId, businessUnitId: salespeople.businessUnitId,
          name: salespeople.name, email: salespeople.email, userId: salespeople.userId, isActive: salespeople.isActive,
          buName: businessUnits.name,
        })
        .from(salespeople)
        .leftJoin(businessUnits, eq(businessUnits.id, salespeople.businessUnitId))
        .where(whereSales)
        .orderBy(asc(salespeople.name)),
      db.select().from(salesTargets).where(and(eq(salesTargets.companyId, COMPANY_ID), eq(salesTargets.year, year))),
    ]);
  } catch {
    dbError = true;
  }

  const byPerson = new Map<number, Map<number, (typeof salesTargets.$inferSelect)>>();
  for (const t of targets) {
    if (!byPerson.has(t.salespersonId)) byPerson.set(t.salespersonId, new Map());
    byPerson.get(t.salespersonId)!.set(t.month, t);
  }

  return (
    <div>
      <PageHeader
        title="Sales Targets"
        subtitle="Monthly revenue targets per salesperson, in their target currency. Feeds target-vs-achievement reports."
        action={
          <form className="flex items-center gap-2">
            <label className="text-sm text-muted">Year</label>
            <select name="year" defaultValue={String(year)} className="field h-9 rounded-lg border border-line-2 bg-surface px-2 text-sm">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Go</button>
          </form>
        }
      />

      {dbError ? (
        <Card><div className="p-6"><EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." /></div></Card>
      ) : sales.length === 0 ? (
        <Card><div className="p-6"><EmptyState title="No active salespeople" hint="Add salespeople first, then set their targets here." /></div></Card>
      ) : (
        <div className="space-y-4">
          {sales.map((s) => {
            const months = byPerson.get(s.id);
            const annualFils = MONTHS.reduce((sum, _m, i) => sum + (months?.get(i + 1)?.targetFils ?? 0), 0);
            const currency = months?.get(1)?.currency ?? "USD";
            return (
              <Card key={s.id}>
                <form action={saveSalesTargets.bind(null, s.id, year)} className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-ink">{s.name}</div>
                      <div className="text-xs text-muted">{s.buName ?? "No unit"} · {year}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wide text-muted">Saved annual</div>
                        <div className="tnum text-sm font-semibold text-ink">{formatFils(annualFils, { currency, withSymbol: true })}</div>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-muted">Currency
                        <input name="currency" defaultValue={currency} maxLength={3} disabled={readOnly} className="field h-8 w-16 rounded-md border border-line-2 bg-surface px-2 text-center text-xs uppercase disabled:opacity-60" />
                      </label>
                      {!readOnly && <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Save</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {MONTHS.map((label, i) => {
                      const fils = months?.get(i + 1)?.targetFils ?? 0;
                      return (
                        <label key={label} className="block">
                          <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted">{label}</span>
                          <input name={`m${i + 1}`} defaultValue={fils ? String(toAed(fils)) : ""} inputMode="decimal" placeholder="0" readOnly={readOnly} className={inp + (readOnly ? " bg-bg/50" : "")} />
                        </label>
                      );
                    })}
                  </div>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
