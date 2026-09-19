import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaChannels } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { mediaChannelFields } from "@/lib/form-fields";
import { getVendorOptions } from "@/lib/crm-options";
import { updateMediaChannel } from "@/actions/media-channels";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function EditMediaChannel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const channelId = Number(id);
  if (!Number.isInteger(channelId)) notFound();

  const [row] = await db
    .select()
    .from(mediaChannels)
    .where(and(eq(mediaChannels.id, channelId), eq(mediaChannels.companyId, COMPANY_ID)))
    .limit(1);
  if (!row) notFound();

  const vendors = await getVendorOptions();
  const action = updateMediaChannel.bind(null, channelId);

  return (
    <div>
      <PageHeader title={row.name} subtitle={`Channel · ${row.code}`} />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={action}
            fields={mediaChannelFields(row, vendors)}
            submitLabel="Update channel"
            cancelHref="/media-channels"
          />
        </div>
      </Card>
    </div>
  );
}
