"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Star, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
import type { FormState } from "@/lib/validators";
import { createContact, deleteContact, makeContactPrimary } from "@/actions/contacts";

type Contact = {
  id: number;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink-2 disabled:opacity-60"
    >
      {pending ? "Adding…" : "Add contact"}
    </button>
  );
}

export function ContactsSection({
  customerId,
  contacts,
}: {
  customerId: number;
  contacts: Contact[];
}) {
  const create = createContact.bind(null, customerId);
  const [state, formAction] = useActionState<FormState, FormData>(create, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the add form once a contact saves successfully.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="mt-8 border-t border-line pt-6">
      <h2 className="font-display text-lg font-semibold text-ink">Contacts</h2>
      <p className="mt-1 mb-4 text-sm text-muted">Key people at this account.</p>

      {contacts.length > 0 && (
        <div className="mb-5 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Phone</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {c.name}{" "}
                    {c.isPrimary && <Badge tone="good">Primary</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{c.role ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted">{c.email ?? "—"}</td>
                  <td className="px-4 py-2.5 tnum text-muted">{c.phone ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {!c.isPrimary && (
                        <form action={makeContactPrimary.bind(null, c.id, customerId)}>
                          <button
                            title="Make primary"
                            className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-ink"
                          >
                            <Star size={15} />
                          </button>
                        </form>
                      )}
                      <form action={deleteContact.bind(null, c.id, customerId)}>
                        <button
                          title="Delete contact"
                          className="rounded-md p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form ref={formRef} action={formAction} className="rounded-lg border border-line bg-bg/40 p-4">
        {state.message && (
          <p className="mb-3 text-sm text-danger">{state.message}</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <input name="name" placeholder="Name *" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
            {state.errors?.name && <p className="mt-1 text-xs text-danger">{state.errors.name[0]}</p>}
          </div>
          <input name="role" placeholder="Role (e.g. Media Buyer)" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
          <div>
            <input name="email" type="email" placeholder="Email" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
            {state.errors?.email && <p className="mt-1 text-xs text-danger">{state.errors.email[0]}</p>}
          </div>
          <input name="phone" placeholder="Phone" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" name="isPrimary" className="h-4 w-4 accent-[var(--color-teal)]" />
            Primary contact
          </label>
          <AddButton />
        </div>
      </form>
    </div>
  );
}
