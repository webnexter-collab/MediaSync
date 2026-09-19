import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { currencies, fxRates } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { currencyFields } from "@/lib/form-fields";
import { updateCurrency } from "@/actions/currencies";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function EditCurrency({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currencyId = Number(id);
  if (!Number.isInteger(currencyId)) notFound();

  const [row] = await db
    .select()
    .from(currencies)
    .where(and(eq(currencies.id, currencyId), eq(currencies.companyId, COMPANY_ID)))
    .limit(1);
  if (!row) notFound();

  const [latest] = await db
    .select({ rate: fxRates.rateToBase })
    .from(fxRates)
    .where(and(eq(fxRates.companyId, COMPANY_ID), eq(fxRates.currencyCode, row.code)))
    .orderBy(desc(fxRates.asOfDate), desc(fxRates.id))
    .limit(1);

  const action = updateCurrency.bind(null, currencyId);

  return (
    <div>
      <PageHeader title={row.code} subtitle={`Currency · ${row.name}`} />
      <Card>
        <div className="px-6 py-6">
          <MasterForm
            action={action}
            fields={currencyFields(row, latest?.rate ?? 1)}
            submitLabel="Update currency"
            cancelHref="/currencies"
          />
        </div>
      </Card>
    </div>
  );
}
