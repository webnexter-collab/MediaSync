import { asc, eq, sql } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { agencyGroups, customers } from "@/db/schema";
import { PageHeader, Card, EmptyState } from "@/components/ui";
import { createAgencyGroup, updateAgencyGroup, deleteAgencyGroup } from "@/actions/masters";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const inp = "field h-9 rounded-md border border-line-2 bg-surface px-2 text-sm";

export default async function AgencyGroupsPage() {
  let rows: { id: number; name: string; agencyCount: number }[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({ id: agencyGroups.id, name: agencyGroups.name, agencyCount: sql<number>`count(${customers.id})`.mapWith(Number) })
      .from(agencyGroups)
      .leftJoin(customers, eq(customers.agencyGroupId, agencyGroups.id))
      .where(eq(agencyGroups.companyId, COMPANY_ID))
      .groupBy(agencyGroups.id)
      .orderBy(asc(agencyGroups.name));
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader title="Agency Groups" subtitle="Group agencies (e.g. GroupM, Publicis) for consolidated revenue reporting." />
      <Card>
        <div className="p-6">
          <form action={createAgencyGroup} className="mb-5 flex gap-2">
            <input name="name" placeholder="New agency group (e.g. GroupM)" className={inp + " w-72"} required />
            <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Add</button>
          </form>

          {dbError ? (
            <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
          ) : rows.length === 0 ? (
            <EmptyState title="No agency groups yet" hint="Add your first group above." />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((g) => (
                <li key={g.id} className="flex items-center gap-2 py-1.5">
                  <form action={updateAgencyGroup.bind(null, g.id)} className="flex flex-1 items-center gap-2">
                    <input name="name" defaultValue={g.name} className={inp + " flex-1"} required />
                    <span className="w-24 shrink-0 text-xs text-muted">{g.agencyCount} {g.agencyCount === 1 ? "agency" : "agencies"}</span>
                    <button className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Save</button>
                  </form>
                  <form action={deleteAgencyGroup.bind(null, g.id)}>
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
