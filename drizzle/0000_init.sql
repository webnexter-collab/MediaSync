CREATE TYPE "public"."document_status" AS ENUM('draft', 'sent', 'accepted', 'rejected', 'partially_paid', 'paid', 'cancelled', 'converted');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('quotation', 'invoice', 'delivery_note', 'purchase_order');--> statement-breakpoint
CREATE TYPE "public"."party_type" AS ENUM('customer', 'supplier');--> statement-breakpoint
CREATE TYPE "public"."payment_direction" AS ENUM('receipt', 'payment');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'bank_transfer', 'cheque', 'card', 'other');--> statement-breakpoint
CREATE TYPE "public"."tax_category" AS ENUM('standard', 'zero_rated', 'exempt', 'out_of_scope', 'reverse_charge');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'accountant', 'sales', 'viewer');--> statement-breakpoint
CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"code" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"legal_name" varchar(200),
	"trn" varchar(15),
	"tin" varchar(10),
	"address_line1" varchar(200),
	"address_line2" varchar(200),
	"city" varchar(100),
	"emirate" varchar(100),
	"country" varchar(2) DEFAULT 'AE' NOT NULL,
	"phone" varchar(40),
	"email" varchar(160),
	"logo_url" text,
	"base_currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(200) NOT NULL,
	"trn" varchar(15),
	"contact_person" varchar(160),
	"email" varchar(160),
	"phone" varchar(40),
	"billing_address" text,
	"shipping_address" text,
	"city" varchar(100),
	"country" varchar(2) DEFAULT 'AE',
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"credit_limit_fils" bigint DEFAULT 0,
	"opening_balance_fils" bigint DEFAULT 0,
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"line_no" integer NOT NULL,
	"item_id" integer,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit_price_fils" bigint DEFAULT 0 NOT NULL,
	"discount_percent" numeric(5, 2) DEFAULT '0',
	"discount_amount_fils" bigint DEFAULT 0 NOT NULL,
	"tax_category" "tax_category" DEFAULT 'standard' NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"line_subtotal_fils" bigint DEFAULT 0 NOT NULL,
	"vat_amount_fils" bigint DEFAULT 0 NOT NULL,
	"line_total_fils" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"branch_id" integer,
	"type" "document_type" NOT NULL,
	"number" varchar(40) NOT NULL,
	"party_type" "party_type" NOT NULL,
	"customer_id" integer,
	"supplier_id" integer,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date,
	"reference" varchar(120),
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"exchange_rate" numeric(12, 6) DEFAULT '1' NOT NULL,
	"subtotal_fils" bigint DEFAULT 0 NOT NULL,
	"discount_total_fils" bigint DEFAULT 0 NOT NULL,
	"vat_total_fils" bigint DEFAULT 0 NOT NULL,
	"grand_total_fils" bigint DEFAULT 0 NOT NULL,
	"amount_paid_fils" bigint DEFAULT 0 NOT NULL,
	"notes" text,
	"terms" text,
	"source_document_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"unit_of_measure" varchar(20) DEFAULT 'unit',
	"unit_price_fils" bigint DEFAULT 0 NOT NULL,
	"tax_category" "tax_category" DEFAULT 'standard' NOT NULL,
	"vat_rate" numeric(5, 2) DEFAULT '5.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"party_type" "party_type" NOT NULL,
	"customer_id" integer,
	"supplier_id" integer,
	"entry_date" date NOT NULL,
	"document_id" integer,
	"payment_id" integer,
	"description" varchar(200),
	"debit_fils" bigint DEFAULT 0 NOT NULL,
	"credit_fils" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "number_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"branch_id" integer,
	"document_type" varchar(30) NOT NULL,
	"year" integer NOT NULL,
	"prefix" varchar(12) NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL,
	"padding" integer DEFAULT 4 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"document_id" integer NOT NULL,
	"amount_allocated_fils" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"direction" "payment_direction" NOT NULL,
	"number" varchar(40) NOT NULL,
	"party_type" "party_type" NOT NULL,
	"customer_id" integer,
	"supplier_id" integer,
	"payment_date" date NOT NULL,
	"method" "payment_method" DEFAULT 'bank_transfer' NOT NULL,
	"reference" varchar(120),
	"amount_fils" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"code" varchar(30) NOT NULL,
	"name" varchar(200) NOT NULL,
	"trn" varchar(15),
	"contact_person" varchar(160),
	"email" varchar(160),
	"phone" varchar(40),
	"address" text,
	"city" varchar(100),
	"country" varchar(2) DEFAULT 'AE',
	"payment_terms_days" integer DEFAULT 0 NOT NULL,
	"opening_balance_fils" bigint DEFAULT 0,
	"currency" varchar(3) DEFAULT 'AED' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"email" varchar(160) NOT NULL,
	"name" varchar(160) NOT NULL,
	"password_hash" text,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_lines" ADD CONSTRAINT "document_lines_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_lines" ADD CONSTRAINT "document_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "number_sequences" ADD CONSTRAINT "number_sequences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "number_sequences" ADD CONSTRAINT "number_sequences_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "branch_code_uq" ON "branches" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_code_uq" ON "customers" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "customer_name_idx" ON "customers" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "line_doc_idx" ON "document_lines" USING btree ("document_id","line_no");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_number_uq" ON "documents" USING btree ("company_id","type","number");--> statement-breakpoint
CREATE INDEX "doc_party_idx" ON "documents" USING btree ("company_id","party_type","status");--> statement-breakpoint
CREATE INDEX "doc_type_date_idx" ON "documents" USING btree ("company_id","type","issue_date");--> statement-breakpoint
CREATE UNIQUE INDEX "item_code_uq" ON "items" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "ledger_customer_idx" ON "ledger_entries" USING btree ("customer_id","entry_date");--> statement-breakpoint
CREATE INDEX "ledger_supplier_idx" ON "ledger_entries" USING btree ("supplier_id","entry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "seq_uq" ON "number_sequences" USING btree ("company_id","branch_id","document_type","year");--> statement-breakpoint
CREATE INDEX "alloc_payment_idx" ON "payment_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "alloc_doc_idx" ON "payment_allocations" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_number_uq" ON "payments" USING btree ("company_id","direction","number");--> statement-breakpoint
CREATE INDEX "payment_party_idx" ON "payments" USING btree ("company_id","party_type");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_code_uq" ON "suppliers" USING btree ("company_id","code");--> statement-breakpoint
CREATE INDEX "supplier_name_idx" ON "suppliers" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_uq" ON "users" USING btree ("email");