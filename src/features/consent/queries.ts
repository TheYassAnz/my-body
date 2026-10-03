import { and, eq } from "drizzle-orm";
import { consent } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/** Version of the consent texts shown at sign-up (specs/07 §2). */
export const CONSENT_VERSION = "2026-09-29";

export async function recordConsents(db: Db, userId: string, now: Date = new Date()) {
  await db.insert(consent).values([
    { userId, kind: "health_data", version: CONSENT_VERSION, acceptedAt: now },
    { userId, kind: "terms", version: CONSENT_VERSION, acceptedAt: now },
  ]);
}

/** Pass `version` to require consents given for that version of the texts only. */
export async function hasRequiredConsents(
  db: Db,
  userId: string,
  version?: string,
): Promise<boolean> {
  const rows = await db
    .select({ kind: consent.kind })
    .from(consent)
    .where(
      version
        ? and(eq(consent.userId, userId), eq(consent.version, version))
        : eq(consent.userId, userId),
    );
  const kinds = new Set(rows.map((r) => r.kind));
  return kinds.has("health_data") && kinds.has("terms");
}
