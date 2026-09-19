import { PageHeader, Card } from "@/components/ui";
import { MasterForm } from "@/components/master-form";
import { bankAccountFields } from "@/lib/form-fields";
import { createBankAccount } from "@/actions/bank-accounts";

export default function NewBankAccount() {
  return (
    <div>
      <PageHeader title="New account" subtitle="Add a bank or cash account." />
      <Card>
        <div className="px-6 py-6">
          <MasterForm action={createBankAccount} fields={bankAccountFields()} submitLabel="Save account" cancelHref="/bank-accounts" />
        </div>
      </Card>
    </div>
  );
}
