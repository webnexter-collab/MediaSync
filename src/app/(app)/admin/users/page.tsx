import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { UserManager } from "@/components/user-manager";

export const dynamic = "force-dynamic";
const COMPANY_ID = 1;

export default async function AdminUsersPage() {
  const me = await requireAdmin();
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.companyId, COMPANY_ID))
    .orderBy(asc(users.name));

  return (
    <div>
      <PageHeader title="Users" subtitle="Create and manage who can access MediaSync and what they can do." />
      <UserManager users={rows} currentUserId={me.userId} />
    </div>
  );
}
