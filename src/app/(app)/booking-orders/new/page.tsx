import { PageHeader, Card } from "@/components/ui";
import { BookingOrderForm } from "@/components/booking-order-form";
import { getBookingOrderFormOptions } from "@/lib/crm-options";
import { createBookingOrder } from "@/actions/booking-orders";

export const dynamic = "force-dynamic";

export default async function NewBookingOrder() {
  const opts = await getBookingOrderFormOptions();
  return (
    <div>
      <PageHeader title="New Booking Order" subtitle="Book media with a publisher on behalf of a client." />
      <Card>
        <div className="px-6 py-6">
          <BookingOrderForm
            action={createBookingOrder}
            vendors={opts.vendors}
            accounts={opts.accounts}
            currencies={opts.currencies}
            channels={opts.channels}
            rateItems={opts.rateItems}
            submitLabel="Create booking order"
          />
        </div>
      </Card>
    </div>
  );
}
