import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaChannels } from "@/db/schema";
import { PageHeader, LinkButton, Card, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

const MEDIA_LABEL: Record<string, string> = { print: "Print", digital: "Digital", radio: "Radio" };

export default async function MediaChannelsPage() {
  let rows: (typeof mediaChannels.$inferSelect)[] = [];
  let dbError = false;
  try {
    rows = await db
      .select()
      .from(mediaChannels)
      .where(eq(mediaChannels.companyId, COMPANY_ID))
      .orderBy(asc(mediaChannels.mediaType), asc(mediaChannels.name));
  } catch {
    dbError = true;
  }

  return (
    <div>
      <PageHeader
        title="Media channels"
        subtitle="Print, digital and radio properties you sell."
        action={<LinkButton href="/media-channels/new">New channel</LinkButton>}
      />
      <Card>
        {dbError ? (
          <EmptyState title="Database not connected yet" hint="Check DATABASE_URL and migrations." />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No channels yet"
            hint="Add your first print, digital or radio channel."
            action={<LinkButton href="/media-channels/new">New channel</LinkButton>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-bg">
                  <td className="px-5 py-3">
                    <Link href={`/media-channels/${c.id}/edit`} className="font-medium text-ink hover:text-teal-ink">
                      {c.code}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{c.name}</td>
                  <td className="px-5 py-3"><Badge tone="neutral">{MEDIA_LABEL[c.mediaType] ?? c.mediaType}</Badge></td>
                  <td className="px-5 py-3">
                    {c.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
