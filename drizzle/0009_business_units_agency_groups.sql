ALTER TYPE "public"."booking_order_status" ADD VALUE 'pending_approval' BEFORE 'sent';--> statement-breakpoint
ALTER TYPE "public"."booking_order_status" ADD VALUE 'approved' BEFORE 'sent';--> statement-breakpoint
ALTER TYPE "public"."media_type" ADD VALUE 'outdoor';--> statement-breakpoint
CREATE TABLE "agency_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(80) NOT NULL,
	"code" varchar(20) NOT NULL,
	"country" varchar(60),
	"default_currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "industries" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"business_unit_id" integer,
	"salesperson_id" integer NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"target_fils" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salespeople" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"business_unit_id" integer,
	"name" varchar(160) NOT NULL,
	"email" varchar(160),
	"user_id" integer,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "business_unit_id" integer;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "salesperson_id" integer;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "industry_id" integer;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "agency_account_id" integer;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "client_account_id" integer;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "receipt_date" date;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "business_unit_id" integer;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "agency_group_id" integer;--> statement-breakpoint
ALTER TABLE "media_channels" ADD COLUMN "business_unit_id" integer;--> statement-breakpoint
ALTER TABLE "rate_cards" ADD COLUMN "business_unit_id" integer;--> statement-breakpoint
ALTER TABLE "suppliers" ADD COLUMN "business_unit_id" integer;--> statement-breakpoint
ALTER TABLE "agency_groups" ADD CONSTRAINT "agency_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "industries" ADD CONSTRAINT "industries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_salesperson_id_salespeople_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."salespeople"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salespeople" ADD CONSTRAINT "salespeople_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salespeople" ADD CONSTRAINT "salespeople_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salespeople" ADD CONSTRAINT "salespeople_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agency_group_name_uq" ON "agency_groups" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "bu_code_uq" ON "business_units" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "industry_name_uq" ON "industries" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_target_uq" ON "sales_targets" USING btree ("company_id","salesperson_id","year","month");--> statement-breakpoint
CREATE INDEX "salesperson_idx" ON "salespeople" USING btree ("company_id","business_unit_id");--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_salesperson_id_salespeople_id_fk" FOREIGN KEY ("salesperson_id") REFERENCES "public"."salespeople"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_industry_id_industries_id_fk" FOREIGN KEY ("industry_id") REFERENCES "public"."industries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_agency_account_id_customers_id_fk" FOREIGN KEY ("agency_account_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_client_account_id_customers_id_fk" FOREIGN KEY ("client_account_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_agency_group_id_agency_groups_id_fk" FOREIGN KEY ("agency_group_id") REFERENCES "public"."agency_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_channels" ADD CONSTRAINT "media_channels_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate_cards" ADD CONSTRAINT "rate_cards_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_business_unit_id_business_units_id_fk" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE no action ON UPDATE no action;