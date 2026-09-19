import { login } from "@/actions/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-ink to-teal text-white">
            <span className="font-display text-xl font-semibold">B</span>
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">MediaSync</h1>
          <p className="mt-1 text-sm text-muted">Sign in to continue</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <LoginForm action={login} next={next ?? "/"} />
        </div>
        <p className="mt-6 text-center text-xs text-muted">Telzon Solutions · MediaSync</p>
      </div>
    </div>
  );
}
