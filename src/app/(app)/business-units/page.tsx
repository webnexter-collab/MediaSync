import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { businessUnits } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { createBusinessUnit, updateBusinessUnit } from "@/actions/masters";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const inp = "field h-9 rounded-md border border-line-2 bg-surface px-2 text-sm";

export default async function BusinessUnitsPage() {
  let rows: (typeof businessUnits.$inferSelect)[] = [];
  let dbError = false;
  try {
    rows = await db.select().from(businessUnits).where(eq(businessUnits.companyId, COMPANY_ID)).orderBy(asc(businessUnits.sortOrder), asc(businessUnits.name));
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader title="Business Units" subtitle="Markets Mindset Media operates — UAE, Beirut, Iraq. Records and reports are tagged by unit." />

      <Card>
        <div className="p-6">
          <form action={createBusinessUnit} className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_1fr_90px_auto]">
            <input name="name" placeholder="Name (e.g. UAE Media)" className={inp} required />
            <input name="code" placeholder="Code" className={inp} required />
            <input name="country" placeholder="Country" className={inp} />
            <input name="defaultCurrency" placeholder="USD" defaultValue="USD" maxLength={3} className={inp + " uppercase"} />
            <button className="inline-flex h-9 items-center justify-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Add</button>
          </form>

          {dbError ? (
            <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
          ) : rows.length === 0 ? (
            <EmptyState title="No business units yet" hint="Add your first business unit above." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Code</th>
                  <th className="px-2 py-2 font-medium">Country</th>
                  <th className="px-2 py-2 font-medium">Currency</th>
                  <th className="px-2 py-2 font-medium">Active</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td colSpan={6} className="py-1.5">
                      <form action={updateBusinessUnit.bind(null, b.id)} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_100px_1fr_90px_60px_auto]">
                        <input name="name" defaultValue={b.name} className={inp} required />
                        <input name="code" defaultValue={b.code} className={inp} required />
                        <input name="country" defaultValue={b.country ?? ""} className={inp} />
                        <input name="defaultCurrency" defaultValue={b.defaultCurrency} maxLength={3} className={inp + " uppercase"} />
                        <label className="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" name="isActive" defaultChecked={b.isActive} /> On</label>
                        <button className="inline-flex h-9 items-center justify-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Save</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-xs text-muted">Business units are referenced by booking orders and reports, so they cannot be deleted — switch a retired unit to inactive instead.</p>
        </div>
      </Card>
    </div>
  );
}
