"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, ReceiptText, Truck, HandCoins, ShoppingCart,
  Banknote, Users, Building2, Package, Landmark, TrendingUp, TrendingDown,
  FileUser, FileBox, ShieldCheck, LogOut, Settings, X, type LucideIcon,
} from "lucide-react";
import { logout } from "@/actions/auth";
import type { Role } from "@/lib/session";

type Item = { href: string; label: string; icon: LucideIcon };
type Group = { title: string; items: Item[]; adminOnly?: boolean };

const groups: Group[] = [
  { title: "Overview", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  { title: "Sales", items: [
    { href: "/quotations", label: "Quotations", icon: FileText },
    { href: "/invoices", label: "Invoices", icon: ReceiptText },
    { href: "/delivery-notes", label: "Delivery Notes", icon: Truck },
    { href: "/receipts", label: "Receipts", icon: HandCoins },
  ]},
  { title: "Purchasing", items: [
    { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
    { href: "/payments", label: "Payments", icon: Banknote },
  ]},
  { title: "Masters", items: [
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/suppliers", label: "Suppliers", icon: Building2 },
    { href: "/items", label: "Items", icon: Package },
    { href: "/bank-accounts", label: "Bank & Cash", icon: Landmark },
  ]},
  { title: "Reports", items: [
    { href: "/reports/aged-receivables", label: "Aged Receivables", icon: TrendingUp },
    { href: "/reports/aged-payables", label: "Aged Payables", icon: TrendingDown },
    { href: "/reports/customer-statement", label: "Customer Statement", icon: FileUser },
    { href: "/reports/supplier-statement", label: "Supplier Statement", icon: FileBox },
  ]},
  { title: "Administration", adminOnly: true, items: [
    { href: "/admin/users", label: "Users", icon: ShieldCheck },
  ]},
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator", user: "User", demo: "Demo user",
  accountant: "Accountant", sales: "Sales", viewer: "Viewer",
};

export function Nav({
  role,
  userName,
  userEmail,
  onNavigate,
}: {
  role: Role;
  userName: string;
  userEmail: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visible = groups.filter((g) => !g.adminOnly || role === "admin");
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-ink to-teal text-white">
          <ReceiptText size={18} />
        </div>
        <div className="flex-1">
          <div className="font-display text-xl font-semibold leading-none text-ink">MediaSync</div>
          <div className="mt-1 text-[11px] tracking-wide text-muted">Telzon Solutions</div>
        </div>
        {onNavigate && (
          <button onClick={onNavigate} aria-label="Close menu" className="rounded-md p-1 text-muted hover:bg-bg lg:hidden">
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {visible.map((g) => (
          <div key={g.title}>
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{g.title}</div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <Link href={it.href} onClick={onNavigate}
                      className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-ink text-white" : "text-fg hover:bg-bg"}`}>
                      <Icon size={16} className={active ? "text-white" : "text-muted group-hover:text-ink"} />
                      <span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line px-4 py-3">
        <div className="mb-2 flex items-center gap-2.5 px-1">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white">
            {(userName || userEmail).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-ink">{userName || userEmail}</div>
            <div className="truncate text-[11px] text-muted">{ROLE_LABEL[role] ?? role}</div>
          </div>
        </div>
        <Link href="/account" onClick={onNavigate} className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-colors hover:bg-bg">
          <Settings size={15} className="text-muted" /> My account
        </Link>
        <form action={logout}>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-colors hover:bg-bg">
            <LogOut size={15} className="text-muted" /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
