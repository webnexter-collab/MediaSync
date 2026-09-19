/** Extracts the real Postgres error from Drizzle's wrapper (the cause holds code/constraint/message). */
export function describeDbError(e: unknown): { code?: string; constraint?: string; message: string } {
  const top = e as { message?: string; cause?: unknown } | null;
  const cause = (top?.cause ?? e) as { code?: string; constraint?: string; detail?: string; message?: string } | null;
  const message =
    cause?.detail || cause?.message || (e instanceof Error ? e.message : "Unknown database error");
  return { code: cause?.code, constraint: cause?.constraint, message };
}

export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  const { code, constraint: c, message } = describeDbError(e);
  if (code !== "23505") return false;
  if (!constraint) return true;
  return (c ?? "").includes(constraint) || message.includes(constraint);
}
