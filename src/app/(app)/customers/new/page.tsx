import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { customerFields } from "@/lib/form-fields";
import { createCustomer } from "@/actions/customers";
import { nextCustomerCode } from "@/lib/next-code";

export const dynamic = "force-dynamic";

export default async function NewCustomer() {
  const suggestedCode = await nextCustomerCode();
  return (
    <div>
      <PageHeader title="New customer" subtitle="Add a customer to your directory." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={createCustomer}
            fields={customerFields(undefined, suggestedCode)}
            submitLabel="Save customer"
            cancelHref="/customers"
          />
        </div>
      </Card>
    </div>
  );
}
