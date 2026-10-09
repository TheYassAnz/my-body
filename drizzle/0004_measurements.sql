CREATE TYPE "public"."zone" AS ENUM('neck', 'shoulders', 'chest', 'arm', 'waist', 'hips', 'thigh', 'calf');--> statement-breakpoint
CREATE TABLE "measurement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"zone" "zone" NOT NULL,
	"value_cm" numeric(4, 1) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "measurement_session_zone_unique" UNIQUE("session_id","zone"),
	CONSTRAINT "measurement_value_range" CHECK ("measurement"."value_cm" between 10 and 250)
);
--> statement-breakpoint
CREATE TABLE "measurement_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "measurement_session_user_date_unique" UNIQUE("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "measurement" ADD CONSTRAINT "measurement_session_id_measurement_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."measurement_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_session" ADD CONSTRAINT "measurement_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;