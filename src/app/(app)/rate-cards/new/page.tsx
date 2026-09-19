import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { rateCardFields } from "@/lib/form-fields";
import { getAccountFormOptions } from "@/lib/crm-options";
import { createRateCard } from "@/actions/rate-cards";

export const dynamic = "force-dynamic";

export default async function NewRateCard() {
  const { currencies } = await getAccountFormOptions();
  return (
    <div>
      <PageHeader title="New rate card" subtitle="Create a rate card, then add priced items to it." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={createRateCard}
            fields={rateCardFields(undefined, currencies)}
            submitLabel="Create rate card"
            cancelHref="/rate-cards"
          />
        </div>
      </Card>
    </div>
  );
}
