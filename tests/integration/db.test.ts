import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { session, user } from "@/lib/db/schema";
import type { Db } from "@/lib/db/types";
import { createTestDb, insertTestUser } from "../helpers/db";

describe("database schema", () => {
  let db: Db;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  });
  afterEach(() => close());

  it("deletes a user's sessions when the user is deleted", async () => {
    await insertTestUser(db, "u1");
    await db.insert(session).values({
      id: "s1",
      token: "t1",
      userId: "u1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await db.delete(user).where(eq(user.id, "u1"));

    expect(await db.select().from(session)).toEqual([]);
  });
});
