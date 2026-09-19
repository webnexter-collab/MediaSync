import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bankAccounts } from "@/db/schema";
import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { bankAccountFields } from "@/lib/form-fields";
import { updateBankAccount } from "@/actions/bank-accounts";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function EditBankAccount({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acctId = Number(id);
  if (!Number.isInteger(acctId)) notFound();
  const [row] = await db.select().from(bankAccounts)
    .where(and(eq(bankAccounts.id, acctId), eq(bankAccounts.companyId, COMPANY_ID))).limit(1);
  if (!row) notFound();
  const action = updateBankAccount.bind(null, acctId);
  return (
    <div>
      <PageHeader title={row.name} subtitle={`${row.type === "cash" ? "Cash" : "Bank"} account`} />
      <Card>
        <div className="px-6 py-6">
          <MasterForm action={action} fields={bankAccountFields(row)} submitLabel="Update account" cancelHref="/bank-accounts" />
        </div>
      </Card>
    </div>
  );
}
