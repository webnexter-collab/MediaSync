"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ReceiptText } from "lucide-react";
import { Nav } from "@/components/nav";
import type { Role } from "@/lib/session";

export function Shell({
  role,
  userName,
  userEmail,
  demo,
  children,
}: {
  role: Role;
  userName: string;
  userEmail: string;
  demo: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className={`min-h-screen lg:flex ${demo ? "demo-mode" : ""}`}>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-ink hover:bg-bg"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-ink to-teal text-white">
            <ReceiptText size={15} />
          </div>
          <span className="font-display text-lg font-semibold text-ink">MediaSync</span>
        </div>
      </header>

      {/* Desktop sidebar */}
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen">
        <Nav role={role} userName={userName} userEmail={userEmail} />
      </div>

      {/* Mobile drawer + backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Nav role={role} userName={userName} userEmail={userEmail} onNavigate={() => setOpen(false)} />
      </div>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
