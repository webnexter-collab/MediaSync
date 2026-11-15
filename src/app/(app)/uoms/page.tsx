import { asc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { uoms } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { createUom, updateUom, deleteUom } from "@/actions/uoms";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const MEDIA: [string, string][] = [["tv", "TV"], ["radio", "Radio"], ["print", "Print"], ["digital", "Digital"], ["website", "Website"], ["outdoor", "Outdoor"]];
const inp = "field h-9 rounded-md border border-line-2 bg-surface px-2 text-sm";

function parse(json: string | null): string[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function MediaChecks({ selected }: { selected: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {MEDIA.map(([value, label]) => (
        <label key={value} className="flex items-center gap-1 text-xs text-fg">
          <input type="checkbox" name="media" value={value} defaultChecked={selected.includes(value)} /> {label}
        </label>
      ))}
    </div>
  );
}

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
      <PageHeader title="Units of Measure" subtitle="Each unit is tied to the media it applies to. A Booking Order line only offers the units for its media." />
      <Card>
        <div className="p-6">
          <form action={createUom} className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-bg/40 p-3">
            <input name="name" placeholder="New unit (e.g. Spot, Insertion, CPM)" className={inp + " w-64"} required />
            <MediaChecks selected={[]} />
            <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Add</button>
          </form>

          {dbError ? (
            <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
          ) : rows.length === 0 ? (
            <EmptyState title="No units yet" hint="Add your first unit of measure above." />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((u) => (
                <li key={u.id} className="flex items-center gap-2 py-2">
                  <form action={updateUom.bind(null, u.id)} className="flex flex-1 flex-wrap items-center gap-3">
                    <input name="name" defaultValue={u.name} className={inp + " w-48"} required />
                    <MediaChecks selected={parse(u.mediaTypes)} />
                    <button className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Save</button>
                  </form>
                  <form action={deleteUom.bind(null, u.id)}>
                    <button title="Delete" className="grid h-9 w-9 place-items-center rounded-lg border border-line-2 bg-surface text-muted hover:text-danger"><Trash2 size={15} /></button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">Leave every media unticked for a unit that applies to all media (for example Day, Month, Package).</p>
        </div>
      </Card>
    </div>
  );
}
