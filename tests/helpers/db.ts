import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/lib/db/schema";
import { user } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";

/** Fresh in-memory Postgres with every migration applied. */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db, close: () => client.close() };
}

export async function insertTestUser(db: Db, id: string, email = `${id}@example.com`) {
  await db.insert(user).values({ id, name: id, email });
}
