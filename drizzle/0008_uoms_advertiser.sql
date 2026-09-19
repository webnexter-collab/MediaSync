ALTER TYPE "public"."account_type" ADD VALUE 'advertiser';--> statement-breakpoint
CREATE TABLE "uoms" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(40) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uoms" ADD CONSTRAINT "uoms_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uom_name_uq" ON "uoms" USING btree ("company_id","name");