import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { supplierFields } from "@/lib/form-fields";
import { updateSupplier } from "@/actions/suppliers";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function EditSupplier({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplierId = Number(id);
  if (!Number.isInteger(supplierId)) notFound();

  const [row] = await db
    .select()
    .from(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.companyId, COMPANY_ID)))
    .limit(1);

  if (!row) notFound();

  const action = updateSupplier.bind(null, supplierId);

  return (
    <div>
      <PageHeader title={row.name} subtitle={`Supplier · ${row.code}`} />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={action}
            fields={supplierFields(row)}
            submitLabel="Update supplier"
            cancelHref="/suppliers"
          />
        </div>
      </Card>
    </div>
  );
}
