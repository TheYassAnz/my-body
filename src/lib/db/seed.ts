/**
 * pnpm db:seed — development and CI only. Recreates demo@my-body.test with 120 days
 * of weighings (specs/04 §6). L3 adds a loss goal, L4 ten measurement sessions.
 */
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { recordConsents } from "@/features/consent/queries";
import { createGoal } from "@/features/goals/queries";
import { upsertMeasure } from "@/features/measurements/queries";
import { markOnboardingCompleted, saveBodyInfo, saveSex } from "@/features/profile/queries";
import { insertWeights } from "@/features/weight/queries";
import { createAuth } from "@/lib/auth/create-auth";
import { today } from "@/lib/dates";
import { ZONES } from "@/lib/metrics";
import { sqlState } from "./errors";
import { requireEnv } from "@/lib/env";
import * as schema from "./schema";
import { user } from "./schema";
import { DEMO_EMAIL, demoGoal, demoMeasurements, demoWeights } from "./seed-data";

async function main() {
  loadEnvConfig(process.cwd());
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    throw new Error("db:seed refuses to run in production");
  }
  const password = requireEnv("SEED_DEMO_PASSWORD");
  const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });
  const db = drizzle(pool, { schema });

  try {
    await db.delete(user).where(eq(user.email, DEMO_EMAIL)); // cascades to every table
    const auth = createAuth({
      db,
      sendEmail: async () => {},
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
      secret: process.env.BETTER_AUTH_SECRET || "seed-only-secret-0123456789abcdef0123",
      rateLimitEnabled: false,
      withNextCookies: false,
    });
    const { user: demo } = await auth.api.signUpEmail({
      body: { email: DEMO_EMAIL, password, name: "Démo" },
    });
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, demo.id));
    await recordConsents(db, demo.id);
    await saveSex(db, demo.id, "male", "Europe/Paris");
    await saveBodyInfo(db, demo.id, { heightCm: 178, birthDate: "1990-04-12", lengthUnit: "cm" });
    const weights = demoWeights(today("Europe/Paris"));
    await insertWeights(db, demo.id, weights);
    await createGoal(db, demo.id, demoGoal(today("Europe/Paris"), weights));
    for (const session of demoMeasurements(today("Europe/Paris"))) {
      for (const zone of ZONES) {
        await upsertMeasure(db, demo.id, {
          date: session.date,
          zone,
          valueCm: session.values[zone],
        });
      }
    }
    await markOnboardingCompleted(db, demo.id);
    console.log(`Seeded ${DEMO_EMAIL}`); // no health data in logs
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  // SQLSTATE only: Drizzle messages embed the query params (demo data).
  console.error("seed_failed", { code: sqlState(error) });
  process.exit(1);
});
