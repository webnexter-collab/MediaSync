import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { taxRuleFields } from "@/lib/form-fields";
import { createTaxRule } from "@/actions/tax-rules";

export const dynamic = "force-dynamic";

export default function NewTaxRule() {
  return (
    <div>
      <PageHeader title="New tax rule" subtitle="Define a rate for a jurisdiction and category." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={createTaxRule}
            fields={taxRuleFields()}
            submitLabel="Save tax rule"
            cancelHref="/tax-rules"
          />
        </div>
      </Card>
    </div>
  );
}
