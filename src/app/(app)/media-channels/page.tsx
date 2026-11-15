import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaChannels, businessUnits } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;
const MEDIA_LABEL: Record<string, string> = { print: "Print", digital: "Digital", radio: "Radio", tv: "TV", website: "Website", outdoor: "Outdoor" };

function mediaList(json: string | null, main: string): string[] {
  try {
    const v = JSON.parse(json ?? "[]");
    if (Array.isArray(v) && v.length) return v.map(String);
  } catch {
    /* fall through */
  }
  return [main];
}

export default async function AssetsPage() {
  let rows: { id: number; code: string; name: string; mediaType: string; allowedMedia: string | null; isActive: boolean; buName: string | null }[] = [];
  let dbError = false;
  try {
    rows = await db
      .select({
        id: mediaChannels.id, code: mediaChannels.code, name: mediaChannels.name, mediaType: mediaChannels.mediaType,
        allowedMedia: mediaChannels.allowedMedia, isActive: mediaChannels.isActive, buName: businessUnits.name,
      })
      .from(mediaChannels)
      .leftJoin(businessUnits, eq(businessUnits.id, mediaChannels.businessUnitId))
      .where(eq(mediaChannels.companyId, COMPANY_ID))
      .orderBy(asc(businessUnits.sortOrder), asc(mediaChannels.name));
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        subtitle="The media properties each business unit sells. An asset decides which media and units a Booking Order can use."
        action={<LinkButton href="/media-channels/new">New asset</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
        ) : rows.length === 0 ? (
          <EmptyState title="No assets yet" hint="Add the first asset for a business unit." action={<LinkButton href="/media-channels/new">New asset</LinkButton>} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Asset</th>
                <th className="px-5 py-3 font-medium">Business Unit</th>
                <th className="px-5 py-3 font-medium">Media</th>
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3"><Link href={`/media-channels/${c.id}/edit`} className="font-medium text-ink hover:text-teal-ink">{c.name}</Link></td>
                  <td className="px-5 py-3 text-muted">{c.buName ?? "—"}</td>
                  <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{mediaList(c.allowedMedia, c.mediaType).map((m) => <Badge key={m} tone="neutral">{MEDIA_LABEL[m] ?? m}</Badge>)}</div></td>
                  <td className="px-5 py-3 tnum text-muted">{c.code}</td>
                  <td className="px-5 py-3">{c.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
