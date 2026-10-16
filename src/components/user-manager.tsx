"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createUser, updateUser, deleteUser } from "@/actions/users";
import { Card, Badge } from "@/components/ui";
import type { FormState } from "@/lib/validators";

type UserRow = { id: number; name: string; email: string; role: string; isActive: boolean };

const ROLE_OPTIONS: [string, string][] = [
  ["admin", "Administrator"], ["accountant", "Accounts"], ["sales", "Sales"], ["user", "User"], ["demo", "Demo user"],
];
const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator", accountant: "Accounts", sales: "Sales",
  user: "User", demo: "Demo user", salesperson: "Sales", viewer: "Viewer",
};
const ROLE_TONE: Record<string, "good" | "neutral" | "muted"> = {
  admin: "good", accountant: "neutral", sales: "neutral",
  user: "neutral", demo: "muted", salesperson: "neutral", viewer: "muted",
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inp = "field h-9 w-full rounded-md border border-line-2 bg-surface px-2 text-sm";

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
            <select name="role" defaultValue="sales" className="field h-10 w-full rounded-lg border border-line-2 bg-surface px-3 text-sm">
              <option value="admin">Administrator</option>
              <option value="accountant">Accounts</option>
              <option value="sales">Sales</option>
              <option value="user">User</option>
              <option value="demo">Demo user</option>
            </select>
          </div>
          <div className="flex items-end">
            <CreateButton />
          </div>
        </form>
        <div className="border-t border-line px-5 py-3 text-xs text-muted">
          Administrators manage users, configuration and everything else. Accounts handle finance (invoices, receipts, bank &amp; cash). Sales are salespeople — they see only their own bookings, proformas and targets (targets are set by Administrators/Accounts). Users can create and edit documents. Demo users can only view — no saving or downloads.
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
              if (editingId === u.id) {
                return (
                  <tr key={u.id} className="border-b border-line bg-bg/40 last:border-0">
                    <td colSpan={5} className="px-5 py-3">
                      <form action={updateUser.bind(null, u.id)} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1.3fr_1.6fr_1fr_auto_auto_auto]">
                        <div>
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Name</label>
                          <input name="name" defaultValue={u.name} className={inp} required />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Email</label>
                          <input name="email" type="email" defaultValue={u.email} className={inp} required />
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">Role</label>
                          <select name="role" defaultValue={u.role} className={inp}>
                            {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[10px] uppercase tracking-wide text-muted">New password</label>
                          <input name="password" type="text" autoComplete="off" placeholder="optional" className={inp + " w-36"} />
                        </div>
                        <label className="flex h-9 items-center gap-1.5 text-xs text-muted"><input type="checkbox" name="isActive" defaultChecked={u.isActive} /> Active</label>
                        <div className="flex gap-2">
                          <button className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-white hover:bg-ink-2">Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="inline-flex h-9 items-center rounded-lg border border-line-2 bg-surface px-3 text-sm font-medium hover:bg-bg">Cancel</button>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={u.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-5 py-3 text-muted">{u.email}</td>
                  <td className="px-5 py-3"><Badge tone={ROLE_TONE[u.role] ?? "neutral"}>{ROLE_LABEL[u.role] ?? u.role}</Badge></td>
                  <td className="px-5 py-3">{u.isActive ? <Badge tone="good">Active</Badge> : <Badge tone="muted">Inactive</Badge>}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button type="button" onClick={() => setEditingId(u.id)} className="text-xs font-medium text-teal-ink hover:underline">Edit</button>
                      {u.id === currentUserId ? (
                        <span className="text-xs text-muted">You</span>
                      ) : (
                        <form action={del} className="inline">
                          <button className="text-xs font-medium text-danger hover:underline">Delete</button>
                        </form>
                      )}
                    </div>
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
