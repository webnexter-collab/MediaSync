import { asc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { uoms } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { createUom, deleteUom } from "@/actions/uoms";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function UomsPage() {
  let rows: (typeof uoms.$inferSelect)[] = [];
  let dbError = false;
  try {
    rows = await db.select().from(uoms).where(eq(uoms.companyId, COMPANY_ID)).orderBy(asc(uoms.sortOrder), asc(uoms.name));
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader title="Units of Measure" subtitle="Maintain the UOM list used in Booking Orders and rate cards." />
      <Card>
        <div className="p-6">
          <form action={createUom} className="mb-5 flex gap-2">
            <input name="name" placeholder="New UOM (e.g. Insertion, Spot, CPM)" className="field h-10 w-72 rounded-lg border border-line-2 bg-surface px-3 text-sm" />
            <button className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Add</button>
          </form>

          {dbError ? (
            <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
          ) : rows.length === 0 ? (
            <EmptyState title="No units yet" hint="Add your first unit of measure above." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {rows.map((u) => (
                <span key={u.id} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">
                  {u.name}
                  <form action={deleteUom.bind(null, u.id)}>
                    <button title="Delete" className="text-muted hover:text-danger"><Trash2 size={14} /></button>
                  </form>
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
