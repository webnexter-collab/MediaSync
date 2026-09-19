import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { customers, contacts } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { ContactsSection } from "@/components/contacts-section";
import { customerFields } from "@/lib/form-fields";
import { getAccountFormOptions } from "@/lib/crm-options";
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

  const [options, contactRows] = await Promise.all([
    getAccountFormOptions(customerId),
    db
      .select()
      .from(contacts)
      .where(and(eq(contacts.customerId, customerId), eq(contacts.companyId, COMPANY_ID)))
      .orderBy(desc(contacts.isPrimary), asc(contacts.name)),
  ]);
  const action = updateCustomer.bind(null, customerId);

  return (
    <div>
      <PageHeader title={row.name} subtitle={`Account · ${row.code}`} />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={action}
            fields={customerFields(row, undefined, options)}
            submitLabel="Update account"
            cancelHref="/customers"
          />
          <ContactsSection customerId={customerId} contacts={contactRows} />
        </div>
      </Card>
    </div>
  );
}
