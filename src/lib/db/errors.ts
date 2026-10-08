/** SQLSTATE of a Postgres error, which Drizzle may wrap in `cause`. */
export function sqlState(error: unknown): string | undefined {
  for (let e: unknown = error, i = 0; e && typeof e === "object" && i < 3; i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}
