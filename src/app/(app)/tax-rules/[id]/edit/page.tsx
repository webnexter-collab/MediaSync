import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { taxRules } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { taxRuleFields } from "@/lib/form-fields";
import { updateTaxRule } from "@/actions/tax-rules";

export const dynamic = "force-dynamic";

const COMPANY_ID = 1;

export default async function EditTaxRule({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ruleId = Number(id);
  if (!Number.isInteger(ruleId)) notFound();

  const [row] = await db
    .select()
    .from(taxRules)
    .where(and(eq(taxRules.id, ruleId), eq(taxRules.companyId, COMPANY_ID)))
    .limit(1);
  if (!row) notFound();

  const action = updateTaxRule.bind(null, ruleId);

  return (
    <div>
      <PageHeader title={row.name} subtitle={`Tax rule · ${row.country}`} />
      <Card>
        <div className="px-6 py-6">
          <MasterForm action={action} fields={taxRuleFields(row)} submitLabel="Update tax rule" cancelHref="/tax-rules" />
        </div>
      </Card>
    </div>
  );
}
