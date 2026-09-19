import { requireSession } from "@/lib/auth";
import { PageHeader, Card } from "@/components/ui";
import { ChangePasswordForm } from "@/components/change-password-form";
import { changePassword } from "@/actions/account";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator", user: "User", demo: "Demo user",
  accountant: "Accountant", sales: "Sales", viewer: "Viewer",
};

export default async function AccountPage() {
  const session = await requireSession();
  return (
    <div>
      <PageHeader title="My account" subtitle="Your profile and password." />
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><div className="p-5"><div className="text-xs uppercase tracking-wide text-muted">Name</div><div className="mt-1 font-medium text-ink">{session.name}</div></div></Card>
        <Card><div className="p-5"><div className="text-xs uppercase tracking-wide text-muted">Email</div><div className="mt-1 font-medium text-ink">{session.email}</div></div></Card>
        <Card><div className="p-5"><div className="text-xs uppercase tracking-wide text-muted">Role</div><div className="mt-1 font-medium text-ink">{ROLE_LABEL[session.role] ?? session.role}</div></div></Card>
      </div>
      <Card>
        <div className="border-b border-line px-5 py-3"><h2 className="font-display text-lg font-semibold text-ink">Change password</h2></div>
        <div className="p-5">
          <ChangePasswordForm action={changePassword} />
        </div>
      </Card>
    </div>
  );
}
