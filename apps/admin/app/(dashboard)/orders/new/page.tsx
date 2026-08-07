import { OrderBuilder } from "@/components/order-builder";

export default function NewOrderPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New order</h1>
      <p className="text-sm text-muted-foreground max-w-lg">
        Type each attar the customer named on WhatsApp. If more than one
        brand carries the same name, the brand is shown next to it so you
        pick the right one.
      </p>
      <OrderBuilder />
    </div>
  );
}
