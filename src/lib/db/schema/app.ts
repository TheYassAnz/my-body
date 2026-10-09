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
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lb"]);
export const lengthUnitEnum = pgEnum("length_unit", ["cm", "in"]);
export const consentKindEnum = pgEnum("consent_kind", ["health_data", "terms"]);
export const goalTypeEnum = pgEnum("goal_type", ["lose", "gain", "recomp", "maintain"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "achieved", "archived"]);

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

export const goal = pgTable(
  "goal",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: goalTypeEnum("type").notNull(),
    status: goalStatusEnum("status").default("active").notNull(),
    // Local calendar dates (profile timezone), like weight_entry.date.
    startDate: date("start_date", { mode: "string" }).notNull(),
    // Trend at creation (latest weighing while calibrating); the reference for maintain and recomp.
    startWeightKg: numeric("start_weight_kg", { precision: 5, scale: 2, mode: "number" }).notNull(),
    targetWeightKg: numeric("target_weight_kg", { precision: 5, scale: 2, mode: "number" }),
    weeklyRatePct: numeric("weekly_rate_pct", { precision: 3, scale: 2, mode: "number" }),
    endedAt: date("ended_at", { mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    // EF-GOAL-02: one active goal per user.
    uniqueIndex("goal_one_active_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'active'`),
    index("goal_user_id_idx").on(t.userId),
    check(
      "goal_target_and_rate",
      sql`(${t.type} in ('lose', 'gain')) = (${t.targetWeightKg} is not null and ${t.weeklyRatePct} is not null)`,
    ),
    check(
      "goal_target_with_rate",
      sql`(${t.targetWeightKg} is null) = (${t.weeklyRatePct} is null)`,
    ),
    check(
      "goal_rate_range",
      sql`${t.weeklyRatePct} is null
        or (${t.type} = 'lose' and ${t.weeklyRatePct} between 0.25 and 1.5)
        or (${t.type} = 'gain' and ${t.weeklyRatePct} between 0.1 and 0.75)`,
    ),
    check(
      "goal_weight_range",
      sql`${t.startWeightKg} between 20 and 400
        and (${t.targetWeightKg} is null or ${t.targetWeightKg} between 20 and 400)`,
    ),
    check("goal_ended_at", sql`(${t.status} = 'active') = (${t.endedAt} is null)`),
  ],
);

export const zoneEnum = pgEnum("zone", [
  "neck",
  "shoulders",
  "chest",
  "arm",
  "waist",
  "hips",
  "thigh",
  "calf",
]);

export const measurementSession = pgTable(
  "measurement_session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // Local calendar date of the session (profile timezone), like weight_entry.date.
    date: date("date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  // One session per day, completed as measures come in (specs/04).
  (t) => [unique("measurement_session_user_date_unique").on(t.userId, t.date)],
);

export const measurement = pgTable(
  "measurement",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => measurementSession.id, { onDelete: "cascade" }),
    zone: zoneEnum("zone").notNull(),
    valueCm: numeric("value_cm", { precision: 4, scale: 1, mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    unique("measurement_session_zone_unique").on(t.sessionId, t.zone),
    check("measurement_value_range", sql`${t.valueCm} between 10 and 250`),
  ],
);
