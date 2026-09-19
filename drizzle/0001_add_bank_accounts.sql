CREATE TYPE "public"."bank_account_type" AS ENUM('bank', 'cash');--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" "bank_account_type" DEFAULT 'bank' NOT NULL,
	"bank_name" varchar(120),
	"account_number" varchar(60),
	"iban" varchar(40),
	"opening_balance_fils" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "bank_account_id" integer;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bank_account_name_idx" ON "bank_accounts" USING btree ("company_id","name");--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;