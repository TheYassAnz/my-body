import type { PgDatabase } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

export type Schema = typeof schema;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- driver-agnostic Drizzle type: node-postgres in prod, PGlite in tests
export type Db = PgDatabase<any, Schema>;
