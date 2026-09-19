ALTER TYPE "public"."bank_account_type" ADD VALUE 'credit_card';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'user';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'demo';--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "credit_limit_fils" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "last4" varchar(4);--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "statement_day" integer;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD COLUMN "due_day" integer;