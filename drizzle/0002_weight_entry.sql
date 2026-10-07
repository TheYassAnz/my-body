CREATE TABLE "weight_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"body_fat_pct" numeric(4, 1),
	"note" varchar(140),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weight_entry_user_date_unique" UNIQUE("user_id","date"),
	CONSTRAINT "weight_entry_weight_range" CHECK ("weight_entry"."weight_kg" between 20 and 400),
	CONSTRAINT "weight_entry_body_fat_range" CHECK ("weight_entry"."body_fat_pct" is null or "weight_entry"."body_fat_pct" between 2 and 70)
);
--> statement-breakpoint
ALTER TABLE "weight_entry" ADD CONSTRAINT "weight_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;