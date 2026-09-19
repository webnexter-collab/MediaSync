import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { customerFields } from "@/lib/form-fields";
import { createCustomer } from "@/actions/customers";
import { nextCustomerCode } from "@/lib/next-code";
import { getAccountFormOptions } from "@/lib/crm-options";

export const dynamic = "force-dynamic";

export default async function NewCustomer() {
  const [suggestedCode, options] = await Promise.all([
    nextCustomerCode(),
    getAccountFormOptions(),
  ]);
  return (
    <div>
      <PageHeader title="New account" subtitle="Add a client, agency or buying house." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={createCustomer}
            fields={customerFields(undefined, suggestedCode, options)}
            submitLabel="Save account"
            cancelHref="/customers"
          />
        </div>
      </Card>
    </div>
  );
}
