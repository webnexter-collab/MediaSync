"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/validators";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-60">
      {pending ? "Saving…" : "Update password"}
    </button>
  );
}

export function ChangePasswordForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state.ok, state.message]);

  return (
    <form ref={ref} action={formAction} className="max-w-md space-y-4">
      {state.message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${state.ok ? "border-teal/30 bg-teal/5 text-teal-ink" : "border-danger/30 bg-danger/5 text-danger"}`}>
          {state.message}
        </div>
      )}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Current password</label>
        <input name="currentPassword" type="password" autoComplete="current-password" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">New password</label>
        <input name="newPassword" type="password" autoComplete="new-password" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Confirm new password</label>
        <input name="confirmPassword" type="password" autoComplete="new-password" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
      </div>
      <SubmitButton />
    </form>
  );
}
