import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rateCards } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { rateCardFields } from "@/lib/form-fields";
import { getAccountFormOptions } from "@/lib/crm-options";
import { updateRateCard } from "@/actions/rate-cards";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function EditRateCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cardId = Number(id);
  if (!Number.isInteger(cardId)) notFound();

  const [row] = await db.select().from(rateCards).where(and(eq(rateCards.id, cardId), eq(rateCards.companyId, COMPANY_ID))).limit(1);
  if (!row) notFound();

  const { currencies } = await getAccountFormOptions();
  const action = updateRateCard.bind(null, cardId);

  return (
    <div>
      <PageHeader title={`Edit ${row.name}`} subtitle="Rate card details" />
      <Card>
        <div className="px-6 py-6">
          <MasterForm action={action} fields={rateCardFields(row, currencies)} submitLabel="Update rate card" cancelHref={`/rate-cards/${row.id}`} />
        </div>
      </Card>
    </div>
  );
}
