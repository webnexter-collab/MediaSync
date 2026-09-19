"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import type { FormState } from "@/lib/validators";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "textarea" | "toggle" | "select" | "date";
  placeholder?: string;
  required?: boolean;
  half?: boolean;
  defaultValue?: string | number | boolean;
  hint?: string;
  options?: { value: string; label: string }[];
};

function Errors({ list }: { list?: string[] }) {
  if (!list?.length) return null;
  return <p className="mt-1 text-xs text-danger">{list[0]}</p>;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function MasterForm({
  action,
  fields,
  submitLabel,
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  fields: FieldDef[];
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, { ok: false });

  // Controlled values so user input survives a server-side error (no reset).
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fields) {
      if (f.type === "toggle") continue;
      v[f.name] = f.defaultValue === undefined || f.defaultValue === null ? "" : String(f.defaultValue);
    }
    return v;
  });
  const [toggles, setToggles] = useState<Record<string, boolean>>(() => {
    const v: Record<string, boolean> = {};
    for (const f of fields) if (f.type === "toggle") v[f.name] = f.defaultValue !== false;
    return v;
  });

  const set = (name: string, val: string) => setValues((p) => ({ ...p, [name]: val }));

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
        {fields.map((f) => {
          const err = state.errors?.[f.name];
          const span = f.type === "textarea" || !f.half ? "col-span-2" : "col-span-1";
          const invalid = err?.length ? "border-danger" : "border-line-2";

          if (f.type === "toggle") {
            return (
              <label key={f.name} className={`${span} flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3`}>
                <input
                  type="checkbox"
                  name={f.name}
                  checked={toggles[f.name] ?? true}
                  onChange={(e) => setToggles((p) => ({ ...p, [f.name]: e.target.checked }))}
                  className="h-4 w-4 accent-[var(--color-teal)]"
                />
                <span className="text-sm font-medium text-fg">{f.label}</span>
              </label>
            );
          }

          return (
            <div key={f.name} className={span}>
              <label className="mb-1.5 block text-sm font-medium text-fg">
                {f.label}
                {f.required && <span className="text-danger"> *</span>}
              </label>
              {f.type === "select" ? (
                <select
                  name={f.name}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  className={`field h-10 w-full rounded-lg border ${invalid} bg-surface px-3 text-sm text-fg transition-colors`}
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  rows={3}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  className={`field w-full rounded-lg border ${invalid} bg-surface px-3 py-2 text-sm text-fg transition-colors placeholder:text-muted/60`}
                />
              ) : (
                <input
                  name={f.name}
                  type={f.type ?? "text"}
                  step={f.type === "number" ? "0.01" : undefined}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) => set(f.name, e.target.value)}
                  className={`field tnum h-10 w-full rounded-lg border ${invalid} bg-surface px-3 text-sm text-fg transition-colors placeholder:text-muted/60`}
                />
              )}
              {f.hint && <p className="mt-1 text-xs text-muted">{f.hint}</p>}
              <Errors list={err} />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <SubmitButton label={submitLabel} />
        <Link href={cancelHref} className="inline-flex h-10 items-center rounded-lg border border-line-2 bg-surface px-4 text-sm font-medium text-fg transition-colors hover:bg-bg">
          Cancel
        </Link>
      </div>
    </form>
  );
}
