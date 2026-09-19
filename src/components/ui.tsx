import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const cls =
    variant === "primary"
      ? "bg-ink text-white hover:bg-ink-2"
      : "border border-line-2 bg-surface text-fg hover:bg-bg";
  return (
    <Link
      href={href}
      className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition-colors ${cls}`}
    >
      {children}
    </Link>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-[0_1px_2px_rgba(16,35,63,0.04)]">
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "muted";
}) {
  const map = {
    neutral: "bg-ink/8 text-ink",
    good: "bg-teal/10 text-teal-ink",
    muted: "bg-bg text-muted",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="font-display text-lg text-ink">{title}</div>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}
