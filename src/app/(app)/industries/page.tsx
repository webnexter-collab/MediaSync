import { asc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { industries, industryCategories } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import {
  createIndustry, updateIndustry, deleteIndustry,
  createCategory, updateCategory, deleteCategory,
} from "@/actions/masters";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const inp = "field h-9 rounded-md border border-line-2 bg-surface px-2 text-sm";

export default async function IndustriesPage() {
  let rows: (typeof industries.$inferSelect)[] = [];
  let cats: (typeof industryCategories.$inferSelect)[] = [];
  let dbError = false;
  try {
    [rows, cats] = await Promise.all([
      db.select().from(industries).where(eq(industries.companyId, COMPANY_ID)).orderBy(asc(industries.name)),
      db.select().from(industryCategories).where(eq(industryCategories.companyId, COMPANY_ID)).orderBy(asc(industryCategories.name)),
    ]);
  } catch {
    dbError = true;
  }
  const byIndustry = new Map<number, (typeof industryCategories.$inferSelect)[]>();
  for (const c of cats) {
    if (!byIndustry.has(c.industryId)) byIndustry.set(c.industryId, []);
    byIndustry.get(c.industryId)!.push(c);
  }

  return (
    <div>
      <PageHeader title="Industries & Categories" subtitle="Each industry has its own categories. A Booking Order picks the industry first, then one of its categories." />
      <Card>
        <div className="p-6">
          <form action={createIndustry} className="mb-5 flex gap-2">
            <input name="name" placeholder="New industry (e.g. AUTOMOTIVE)" className={inp + " w-72"} required />
            <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Add industry</button>
          </form>

          {dbError ? (
            <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
          ) : rows.length === 0 ? (
            <EmptyState title="No industries yet" hint="Add your first industry above." />
          ) : (
            <div className="space-y-2">
              {rows.map((n) => {
                const list = byIndustry.get(n.id) ?? [];
                return (
                  <details key={n.id} className="rounded-lg border border-line bg-surface">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="font-medium text-ink">{n.name}</span>
                      <span className="text-xs text-muted">{list.length} {list.length === 1 ? "category" : "categories"}</span>
                    </summary>
                    <div className="border-t border-line px-4 py-3">
                      <div className="mb-3 flex items-center gap-2">
                        <form action={updateIndustry.bind(null, n.id)} className="flex flex-1 items-center gap-2">
                          <input name="name" defaultValue={n.name} className={inp + " flex-1"} required />
                          <button className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Rename</button>
                        </form>
                        <form action={deleteIndustry.bind(null, n.id)}>
                          <button title="Delete industry and its categories" className="grid h-9 w-9 place-items-center rounded-lg border border-line-2 bg-surface text-muted hover:text-danger"><Trash2 size={15} /></button>
                        </form>
                      </div>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Categories</div>
                      <ul className="divide-y divide-line">
                        {list.map((c) => (
                          <li key={c.id} className="flex items-center gap-2 py-1.5">
                            <form action={updateCategory.bind(null, c.id)} className="flex flex-1 items-center gap-2">
                              <input name="name" defaultValue={c.name} className={inp + " flex-1"} required />
                              <button className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Save</button>
                            </form>
                            <form action={deleteCategory.bind(null, c.id)}>
                              <button title="Delete category" className="grid h-9 w-9 place-items-center rounded-lg border border-line-2 bg-surface text-muted hover:text-danger"><Trash2 size={15} /></button>
                            </form>
                          </li>
                        ))}
                      </ul>
                      <form action={createCategory.bind(null, n.id)} className="mt-2 flex gap-2">
                        <input name="name" placeholder="New category" className={inp + " w-72"} required />
                        <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Add category</button>
                      </form>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
