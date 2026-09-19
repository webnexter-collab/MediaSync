import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { items } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { itemFields } from "@/lib/form-fields";
import { updateItem } from "@/actions/items";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) notFound();
  const [row] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.companyId, COMPANY_ID)))
    .limit(1);
  if (!row) notFound();
  const action = updateItem.bind(null, itemId);
  return (
    <div>
      <PageHeader title={row.name} subtitle={`Item · ${row.code}`} />
      <Card>
        <div className="px-6 py-6">
          <MasterForm action={action} fields={itemFields(row)} submitLabel="Update item" cancelHref="/items" />
        </div>
      </Card>
    </div>
  );
}
