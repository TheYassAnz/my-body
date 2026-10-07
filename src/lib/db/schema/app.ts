import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lb"]);
export const lengthUnitEnum = pgEnum("length_unit", ["cm", "in"]);
export const consentKindEnum = pgEnum("consent_kind", ["health_data", "terms"]);

export const profile = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    sex: sexEnum("sex").notNull(),
    // Nullable until onboarding step 2 is saved (spec deviation #5).
    heightCm: numeric("height_cm", { precision: 4, scale: 1, mode: "number" }),
    birthDate: date("birth_date", { mode: "string" }),
    weightUnit: weightUnitEnum("weight_unit").default("kg").notNull(),
    lengthUnit: lengthUnitEnum("length_unit").default("cm").notNull(),
    timezone: text("timezone").default("Europe/Paris").notNull(),
    reminderWeekday: smallint("reminder_weekday"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    check("profile_height_range", sql`${t.heightCm} is null or ${t.heightCm} between 100 and 250`),
    check(
      "profile_reminder_weekday_range",
      sql`${t.reminderWeekday} is null or ${t.reminderWeekday} between 0 and 6`,
    ),
  ],
);

export const consent = pgTable(
  "consent",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: consentKindEnum("kind").notNull(),
    version: text("version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("consent_user_id_idx").on(t.userId)],
);

export const weightEntry = pgTable(
  "weight_entry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Local calendar date of the weighing: no timestamp, so no timezone issue.
    date: date("date", { mode: "string" }).notNull(),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2, mode: "number" }).notNull(),
    bodyFatPct: numeric("body_fat_pct", { precision: 4, scale: 1, mode: "number" }),
    note: varchar("note", { length: 140 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    // EF-WGT-02, and the index for chronological reads.
    unique("weight_entry_user_date_unique").on(t.userId, t.date),
    check("weight_entry_weight_range", sql`${t.weightKg} between 20 and 400`),
    check(
      "weight_entry_body_fat_range",
      sql`${t.bodyFatPct} is null or ${t.bodyFatPct} between 2 and 70`,
    ),
  ],
);
