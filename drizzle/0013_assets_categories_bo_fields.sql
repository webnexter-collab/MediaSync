CREATE TABLE "industry_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"industry_id" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "asset_id" integer;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "category_id" integer;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "region" varchar(80);--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "sales_office" varchar(80);--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "client_bo_ref" varchar(80);--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "revenue_month" date;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "period_note" varchar(80);--> statement-breakpoint
ALTER TABLE "media_channels" ADD COLUMN "allowed_media" text;--> statement-breakpoint
ALTER TABLE "uoms" ADD COLUMN "media_types" text;--> statement-breakpoint
ALTER TABLE "industry_categories" ADD CONSTRAINT "industry_categories_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industry_categories" ADD CONSTRAINT "industry_categories_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "industry_category_uq" ON "industry_categories" USING btree ("industry_id","name");--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_asset_id_media_channels_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_category_id_industry_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."industry_categories"("id") ON DELETE no action ON UPDATE no action;