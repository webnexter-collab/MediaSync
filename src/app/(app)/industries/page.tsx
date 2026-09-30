import { asc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { industries } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { createIndustry, updateIndustry, deleteIndustry } from "@/actions/masters";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const inp = "field h-9 rounded-md border border-line-2 bg-surface px-2 text-sm";

export default async function IndustriesPage() {
  let rows: (typeof industries.$inferSelect)[] = [];
  let dbError = false;
  try {
    rows = await db.select().from(industries).where(eq(industries.companyId, COMPANY_ID)).orderBy(asc(industries.name));
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader title="Industries" subtitle="Advertiser industry categories used to segment revenue on booking orders." />
      <Card>
        <div className="p-6">
          <form action={createIndustry} className="mb-5 flex gap-2">
            <input name="name" placeholder="New industry (e.g. Automotive, Banking)" className={inp + " w-72"} required />
            <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Add</button>
          </form>

          {dbError ? (
            <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
          ) : rows.length === 0 ? (
            <EmptyState title="No industries yet" hint="Add your first industry above." />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((n) => (
                <li key={n.id} className="flex items-center gap-2 py-1.5">
                  <form action={updateIndustry.bind(null, n.id)} className="flex flex-1 items-center gap-2">
                    <input name="name" defaultValue={n.name} className={inp + " flex-1"} required />
                    <button className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Save</button>
                  </form>
                  <form action={deleteIndustry.bind(null, n.id)}>
                    <button title="Delete" className="grid h-9 w-9 place-items-center rounded-lg border border-line-2 bg-surface text-muted hover:text-danger"><Trash2 size={15} /></button>
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
