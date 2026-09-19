CREATE TYPE "public"."booking_order_status" AS ENUM('draft', 'sent', 'confirmed', 'cancelled', 'invoiced');--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE 'tv';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE 'website';--> statement-breakpoint
CREATE TABLE "booking_order_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_order_id" integer NOT NULL,
	"line_no" integer NOT NULL,
	"media_type" "media_type" DEFAULT 'digital' NOT NULL,
	"channel_id" integer,
	"platform" varchar(200),
	"particulars" text,
	"branding_details" text,
	"period" text,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"uom" varchar(40),
	"unit_gross_fils" bigint DEFAULT 0 NOT NULL,
	"discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"unit_net_fils" bigint DEFAULT 0 NOT NULL,
	"line_gross_fils" bigint DEFAULT 0 NOT NULL,
	"line_net_fils" bigint DEFAULT 0 NOT NULL,
	"annexure" text
);
--> statement-breakpoint
CREATE TABLE "booking_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"number" varchar(40) NOT NULL,
	"status" "booking_order_status" DEFAULT 'draft' NOT NULL,
	"publisher_vendor_id" integer,
	"to_name" varchar(200),
	"account_id" integer,
	"advertiser" varchar(200),
	"agency" varchar(200),
	"client" varchar(200),
	"brand" varchar(200),
	"campaign" varchar(200),
	"medium" varchar(120),
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"exchange_rate" numeric(18, 8) DEFAULT '1' NOT NULL,
	"issue_date" date NOT NULL,
	"payment_terms" varchar(200),
	"agency_discount_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"vat_rate_pct" numeric(5, 2) DEFAULT '5' NOT NULL,
	"total_gross_fils" bigint DEFAULT 0 NOT NULL,
	"line_discount_fils" bigint DEFAULT 0 NOT NULL,
	"agency_discount_fils" bigint DEFAULT 0 NOT NULL,
	"total_net_fils" bigint DEFAULT 0 NOT NULL,
	"vat_fils" bigint DEFAULT 0 NOT NULL,
	"grand_total_fils" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"terms" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_order_lines" ADD CONSTRAINT "booking_order_lines_booking_order_id_booking_orders_id_fk" FOREIGN KEY ("booking_order_id") REFERENCES "public"."booking_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_order_lines" ADD CONSTRAINT "booking_order_lines_channel_id_media_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."media_channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_publisher_vendor_id_suppliers_id_fk" FOREIGN KEY ("publisher_vendor_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_account_id_customers_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bo_line_idx" ON "booking_order_lines" USING btree ("booking_order_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "bo_number_uq" ON "booking_orders" USING btree ("company_id","number");--> statement-breakpoint
CREATE INDEX "bo_status_idx" ON "booking_orders" USING btree ("company_id","status","issue_date");