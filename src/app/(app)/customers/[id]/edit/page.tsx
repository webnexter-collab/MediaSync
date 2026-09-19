import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { customerFields } from "@/lib/form-fields";
import { updateCustomer } from "@/actions/customers";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function EditCustomer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customerId = Number(id);
  if (!Number.isInteger(customerId)) notFound();

  const [row] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.companyId, COMPANY_ID)))
    .limit(1);

  if (!row) notFound();

  const action = updateCustomer.bind(null, customerId);

  return (
    <div>
      <PageHeader title={row.name} subtitle={`Customer · ${row.code}`} />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={action}
            fields={customerFields(row)}
            submitLabel="Update customer"
            cancelHref="/customers"
          />
        </div>
      </Card>
    </div>
  );
}
