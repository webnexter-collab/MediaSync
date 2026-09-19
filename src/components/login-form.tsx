"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/validators";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink text-sm font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({
  action,
  next,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  next: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.message && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{state.message}</div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Email</label>
        <input
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          className="field h-11 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          placeholder="you@company.ae"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Password</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="field h-11 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm"
          placeholder="••••••••"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
