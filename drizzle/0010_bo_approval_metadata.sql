ALTER TABLE "booking_orders" ADD COLUMN "submitted_at" timestamp;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD CONSTRAINT "booking_orders_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;