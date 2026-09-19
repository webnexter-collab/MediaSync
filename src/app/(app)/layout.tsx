import { requireSession } from "@/lib/auth";
import { isDemo } from "@/lib/session";
import { Shell } from "@/components/shell";
import { DemoGuard } from "@/components/demo-guard";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const demo = isDemo(session.role);

  return (
    <>
      <Shell role={session.role} userName={session.name} userEmail={session.email} demo={demo}>
        {children}
      </Shell>
      {demo && <DemoGuard email={session.email} />}
    </>
  );
}
