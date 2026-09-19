import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { itemFields } from "@/lib/form-fields";
import { createItem } from "@/actions/items";

export default function NewItem() {
  return (
    <div>
      <PageHeader title="New item" subtitle="Add a product or service to your catalog." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm action={createItem} fields={itemFields()} submitLabel="Save item" cancelHref="/items" />
        </div>
      </Card>
    </div>
  );
}
