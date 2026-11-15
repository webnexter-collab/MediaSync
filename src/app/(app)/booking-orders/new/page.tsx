import { PageHeader, Card } from "@/components/ui";
import { BookingOrderForm } from "@/components/booking-order-form";
import { getBookingOrderFormOptions } from "@/lib/crm-options";
import { createBookingOrder } from "@/actions/booking-orders";

export const dynamic = "force-dynamic";

export default async function NewBookingOrder() {
  const opts = await getBookingOrderFormOptions();
  return (
    <div>
      <PageHeader title="New Booking Order" subtitle="Book an asset for a client. The asset decides the media and units you can pick." />
      <Card>
        <div className="px-6 py-6">
          <BookingOrderForm
            action={createBookingOrder}
            accounts={opts.accounts}
            currencies={opts.currencies}
            assets={opts.assets}
            rateItems={opts.rateItems}
            uomOptions={opts.uomOptions}
            businessUnits={opts.businessUnits}
            salespeople={opts.salespeople}
            industries={opts.industries}
            categories={opts.categories}
            submitLabel="Create booking order"
          />
        </div>
      </Card>
    </div>
  );
}
