import { and, eq } from "drizzle-orm";
import { account } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/** True for email/password accounts; false for Google-only accounts (no password to ask for). */
export async function hasCredentialAccount(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "credential")))
    .limit(1);
  return row !== undefined;
}
