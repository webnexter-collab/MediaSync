CREATE TYPE "public"."account_type" AS ENUM('direct_client', 'agency', 'buying_house');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('print', 'digital', 'radio');--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"role" varchar(120),
	"email" varchar(160),
	"phone" varchar(40),
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" varchar(60) NOT NULL,
	"symbol" varchar(8),
	"decimals" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"rate_to_base" numeric(18, 8) NOT NULL,
	"as_of_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"media_type" "media_type" NOT NULL,
	"name" varchar(160) NOT NULL,
	"code" varchar(30) NOT NULL,
	"vendor_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"country" varchar(2) DEFAULT 'AE' NOT NULL,
	"category" "tax_category" DEFAULT 'standard' NOT NULL,
	"rate_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"effective_from" date,
	"effective_to" date,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "account_type" "account_type" DEFAULT 'direct_client' NOT NULL;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "parent_agency_id" integer;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "agency_commission_pct" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currencies" ADD CONSTRAINT "currencies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_channels" ADD CONSTRAINT "media_channels_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_channels" ADD CONSTRAINT "media_channels_vendor_id_suppliers_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_account_idx" ON "contacts" USING btree ("company_id","customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "currency_code_uq" ON "currencies" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "fx_lookup_idx" ON "fx_rates" USING btree ("company_id","currency_code","as_of_date");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_code_uq" ON "media_channels" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "channel_type_idx" ON "media_channels" USING btree ("company_id","media_type");--> statement-breakpoint
CREATE INDEX "tax_rule_lookup_idx" ON "tax_rules" USING btree ("company_id","country","category");--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_parent_agency_id_customers_id_fk" FOREIGN KEY ("parent_agency_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;