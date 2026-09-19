import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { currencyFields } from "@/lib/form-fields";
import { createCurrency } from "@/actions/currencies";

export const dynamic = "force-dynamic";

export default function NewCurrency() {
  return (
    <div>
      <PageHeader title="New currency" subtitle="Add a currency and its rate to the base currency." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={createCurrency}
            fields={currencyFields()}
            submitLabel="Save currency"
            cancelHref="/currencies"
          />
        </div>
      </Card>
    </div>
  );
}
