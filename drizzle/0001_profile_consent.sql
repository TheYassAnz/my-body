CREATE TYPE "public"."consent_kind" AS ENUM('health_data', 'terms');--> statement-breakpoint
CREATE TYPE "public"."length_unit" AS ENUM('cm', 'in');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
CREATE TABLE "consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "consent_kind" NOT NULL,
	"version" text NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"sex" "sex" NOT NULL,
	"height_cm" numeric(4, 1),
	"birth_date" date,
	"weight_unit" "weight_unit" DEFAULT 'kg' NOT NULL,
	"length_unit" "length_unit" DEFAULT 'cm' NOT NULL,
	"timezone" text DEFAULT 'Europe/Paris' NOT NULL,
	"reminder_weekday" smallint,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_height_range" CHECK ("profile"."height_cm" is null or "profile"."height_cm" between 100 and 250),
	CONSTRAINT "profile_reminder_weekday_range" CHECK ("profile"."reminder_weekday" is null or "profile"."reminder_weekday" between 0 and 6)
);
--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_user_id_idx" ON "consent" USING btree ("user_id");