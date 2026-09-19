import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { rateCards, rateCardItems, mediaChannels } from "@/db/schema";
import { PageHeader, Card, Badge, LinkButton } from "@/components/ui";
import { RateCardItems } from "@/components/rate-card-items";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function RateCardView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = Number(id);
  if (!Number.isInteger(cardId)) notFound();

  const [card] = await db.select().from(rateCards).where(and(eq(rateCards.id, cardId), eq(rateCards.companyId, COMPANY_ID))).limit(1);
  if (!card) notFound();

  const [items, channels] = await Promise.all([
    db.select().from(rateCardItems).where(eq(rateCardItems.rateCardId, cardId)).orderBy(asc(rateCardItems.sortOrder)),
    db.select({ id: mediaChannels.id, name: mediaChannels.name, mediaType: mediaChannels.mediaType })
      .from(mediaChannels).where(and(eq(mediaChannels.companyId, COMPANY_ID), eq(mediaChannels.isActive, true))).orderBy(asc(mediaChannels.name)),
  ]);

  return (
    <div>
      <PageHeader
        title={card.name}
        subtitle={`Rate card · ${card.currency}${card.validFrom ? ` · from ${card.validFrom}` : ""}${card.validTo ? ` to ${card.validTo}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            {card.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
            <LinkButton href={`/rate-cards/${card.id}/edit`} variant="ghost">Edit</LinkButton>
          </div>
        }
      />
      {card.notes && <p className="mb-4 max-w-2xl text-sm text-muted">{card.notes}</p>}
      <Card>
        <div className="px-6 py-6">
          <RateCardItems rateCardId={card.id} currency={card.currency} items={items} channels={channels} />
        </div>
      </Card>
    </div>
  );
}
