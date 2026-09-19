CREATE TABLE "rate_card_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"rate_card_id" integer NOT NULL,
	"media_type" "media_type" DEFAULT 'digital' NOT NULL,
	"channel_id" integer,
	"platform" varchar(200),
	"particulars" text,
	"branding_details" text,
	"uom" varchar(40),
	"unit_gross_fils" bigint DEFAULT 0 NOT NULL,
	"default_discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"valid_from" date,
	"valid_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_card_items" ADD CONSTRAINT "rate_card_items_rate_card_id_rate_cards_id_fk" FOREIGN KEY ("rate_card_id") REFERENCES "public"."rate_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_card_items" ADD CONSTRAINT "rate_card_items_channel_id_media_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."media_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rate_card_item_idx" ON "rate_card_items" USING btree ("rate_card_id","sort_order");--> statement-breakpoint
CREATE INDEX "rate_card_name_idx" ON "rate_cards" USING btree ("company_id","name");