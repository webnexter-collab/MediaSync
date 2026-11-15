import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { mediaChannelFields } from "@/lib/form-fields";
import { getVendorOptions, getAccountFormOptions } from "@/lib/crm-options";
import { createMediaChannel } from "@/actions/media-channels";

export const dynamic = "force-dynamic";

export default async function NewMediaChannel() {
  const [vendors, { businessUnits }] = await Promise.all([getVendorOptions(), getAccountFormOptions()]);
  return (
    <div>
      <PageHeader title="New asset" subtitle="Add a media property (TV channel, newspaper, website, outdoor site) under a business unit." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={createMediaChannel}
            fields={mediaChannelFields(undefined, vendors, businessUnits)}
            submitLabel="Save asset"
            cancelHref="/media-channels"
          />
        </div>
      </Card>
    </div>
  );
}
