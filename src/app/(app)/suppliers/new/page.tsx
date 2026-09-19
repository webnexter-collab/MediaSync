import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { supplierFields } from "@/lib/form-fields";
import { createSupplier } from "@/actions/suppliers";
import { nextSupplierCode } from "@/lib/next-code";

export const dynamic = "force-dynamic";

export default async function NewSupplier() {
  const suggestedCode = await nextSupplierCode();
  return (
    <div>
      <PageHeader title="New publisher" subtitle="Add a media owner / publication / station / network." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={createSupplier}
            fields={supplierFields(undefined, suggestedCode)}
            submitLabel="Save supplier"
            cancelHref="/suppliers"
          />
        </div>
      </Card>
    </div>
  );
}
