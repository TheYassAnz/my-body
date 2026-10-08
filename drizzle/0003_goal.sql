CREATE TYPE "public"."goal_status" AS ENUM('active', 'achieved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('lose', 'gain', 'recomp', 'maintain');--> statement-breakpoint
CREATE TABLE "goal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "goal_type" NOT NULL,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"start_date" date NOT NULL,
	"start_weight_kg" numeric(5, 2) NOT NULL,
	"target_weight_kg" numeric(5, 2),
	"weekly_rate_pct" numeric(3, 2),
	"ended_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_target_and_rate" CHECK (("goal"."type" in ('lose', 'gain')) = ("goal"."target_weight_kg" is not null and "goal"."weekly_rate_pct" is not null)),
	CONSTRAINT "goal_target_with_rate" CHECK (("goal"."target_weight_kg" is null) = ("goal"."weekly_rate_pct" is null)),
	CONSTRAINT "goal_rate_range" CHECK ("goal"."weekly_rate_pct" is null
        or ("goal"."type" = 'lose' and "goal"."weekly_rate_pct" between 0.25 and 1.5)
        or ("goal"."type" = 'gain' and "goal"."weekly_rate_pct" between 0.1 and 0.75)),
	CONSTRAINT "goal_weight_range" CHECK ("goal"."start_weight_kg" between 20 and 400
        and ("goal"."target_weight_kg" is null or "goal"."target_weight_kg" between 20 and 400)),
	CONSTRAINT "goal_ended_at" CHECK (("goal"."status" = 'active') = ("goal"."ended_at" is null))
);
--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "goal_one_active_per_user" ON "goal" USING btree ("user_id") WHERE "goal"."status" = 'active';--> statement-breakpoint
CREATE INDEX "goal_user_id_idx" ON "goal" USING btree ("user_id");