import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { salespeople, businessUnits } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { createSalesperson, updateSalesperson } from "@/actions/masters";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const inp = "field h-9 rounded-md border border-line-2 bg-surface px-2 text-sm";

export default async function SalespeoplePage() {
  let rows: (typeof salespeople.$inferSelect)[] = [];
  let units: { id: number; name: string }[] = [];
  let dbError = false;
  try {
    [rows, units] = await Promise.all([
      db.select().from(salespeople).where(eq(salespeople.companyId, COMPANY_ID)).orderBy(asc(salespeople.name)),
      db.select({ id: businessUnits.id, name: businessUnits.name }).from(businessUnits).where(eq(businessUnits.companyId, COMPANY_ID)).orderBy(asc(businessUnits.sortOrder)),
    ]);
  } catch {
    dbError = true;
  }

  const buOptions = (
    <>
      <option value="">— Unit —</option>
      {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
    </>
  );

  return (
    <div>
      <PageHeader title="Salespeople" subtitle="Sales team assigned per business unit; used for target-vs-achievement reporting." />
      <Card>
        <div className="p-6">
          <form action={createSalesperson} className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_160px_auto]">
            <input name="name" placeholder="Full name" className={inp} required />
            <input name="email" type="email" placeholder="Email (optional)" className={inp} />
            <select name="businessUnitId" className={inp} defaultValue="">
              <option value="">— Unit —</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button className="inline-flex h-9 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Add</button>
          </form>

          {dbError ? (
            <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
          ) : rows.length === 0 ? (
            <EmptyState title="No salespeople yet" hint="Add your first salesperson above." />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((s) => (
                <li key={s.id} className="py-1.5">
                  <form action={updateSalesperson.bind(null, s.id)} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_1fr_160px_60px_auto]">
                    <input name="name" defaultValue={s.name} className={inp} required />
                    <input name="email" type="email" defaultValue={s.email ?? ""} className={inp} />
                    <select name="businessUnitId" className={inp} defaultValue={s.businessUnitId ?? ""}>{buOptions}</select>
                    <label className="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" name="isActive" defaultChecked={s.isActive} /> On</label>
                    <button className="inline-flex h-9 items-center justify-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Save</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
