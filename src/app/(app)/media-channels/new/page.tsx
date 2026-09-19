import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { mediaChannelFields } from "@/lib/form-fields";
import { getVendorOptions } from "@/lib/crm-options";
import { createMediaChannel } from "@/actions/media-channels";

export const dynamic = "force-dynamic";

export default async function NewMediaChannel() {
  const vendors = await getVendorOptions();
  return (
    <div>
      <PageHeader title="New channel" subtitle="Add a print, digital or radio property." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={createMediaChannel}
            fields={mediaChannelFields(undefined, vendors)}
            submitLabel="Save channel"
            cancelHref="/media-channels"
          />
        </div>
      </Card>
    </div>
  );
}
