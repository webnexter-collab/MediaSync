"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createUser, deleteUser } from "@/actions/users";
import { Card, Badge } from "@/components/ui";
import type { FormState } from "@/lib/validators";

type UserRow = { id: number; name: string; email: string; role: string; isActive: boolean };

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator", user: "User", demo: "Demo user",
  accountant: "Accountant", sales: "Sales", viewer: "Viewer",
};
const ROLE_TONE: Record<string, "good" | "neutral" | "muted"> = {
  admin: "good", user: "neutral", demo: "muted",
};

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="inline-flex h-10 items-center rounded-lg bg-ink px-5 text-sm font-medium text-white hover:bg-ink-2 disabled:opacity-60">
      {pending ? "Creating…" : "Create user"}
    </button>
  );
}

export function UserManager({ users, currentUserId }: { users: UserRow[]; currentUserId: number }) {
  const [state, formAction] = useActionState<FormState, FormData>(createUser, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok, state.message]);

  return (
    <div className="space-y-6">
      <Card>
        <div className="border-b border-line px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-ink">Add a user</h2>
        </div>
        <form ref={formRef} action={formAction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
          {state.message && (
            <div className={`col-span-4 rounded-lg border px-4 py-3 text-sm ${state.ok ? "border-teal/30 bg-teal/5 text-teal-ink" : "border-danger/30 bg-danger/5 text-danger"}`}>
              {state.message}
            </div>
          )}
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Full name</label>
            <input name="name" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" placeholder="Jane Doe" />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input name="email" type="email" autoComplete="off" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" placeholder="jane@company.ae" />
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Temporary password</label>
            <input name="password" type="text" autoComplete="off" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm" placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Role</label>
            <select name="role" defaultValue="user" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm">
              <option value="admin">Administrator</option>
              <option value="user">User</option>
              <option value="demo">Demo user</option>
            </select>
          </div>
          <div className="flex items-end">
            <CreateButton />
          </div>
        </form>
        <div className="border-t border-line px-5 py-3 text-xs text-muted">
          Administrators can manage users and everything else. Users can create and edit documents. Demo users can only view — no saving, downloads or copying.
        </div>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const del = deleteUser.bind(null, u.id);
              return (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-5 py-3 text-muted">{u.email}</td>
                  <td className="px-5 py-3"><Badge tone={ROLE_TONE[u.role] ?? "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</Badge></td>
                  <td className="px-5 py-3">{u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</td>
                  <td className="px-5 py-3 text-right">
                    {u.id === currentUserId ? (
                      <span className="text-xs text-muted">You</span>
                    ) : (
                      <form action={del} className="inline">
                        <button className="text-xs font-medium text-danger hover:underline">Delete</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
