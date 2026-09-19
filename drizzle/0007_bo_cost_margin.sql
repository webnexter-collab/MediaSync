ALTER TABLE "booking_order_lines" ADD COLUMN "unit_cost_fils" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_order_lines" ADD COLUMN "line_cost_fils" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "total_cost_fils" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_orders" ADD COLUMN "margin_fils" bigint DEFAULT 0 NOT NULL;