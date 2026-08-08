import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

// "draft" isn't in this list — nothing in the app creates an order with
// that status today (OrderBuilder always saves as "awaiting_payment"), so
// the tab would only ever show 0. Still a valid status in the schema/type
// if that changes later.
const STATUS_FILTERS = [
  "all",
  "awaiting_payment",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = getServerSupabase();

  // Every status's count, in one query — powers the tab bar below so each
  // tab shows how many orders are in it instead of making you click through
  // blind. A handful of rows per query even at real volume, cheap either way.
  const { data: allOrders } = await supabase.from("orders").select("status");
  const counts: Record<string, number> = { all: allOrders?.length ?? 0 };
  for (const o of allOrders ?? []) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }

  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_phone, status, total_inr, created_at")
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  const { data: orders, error } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Orders</h1>
        <Link
          href="/orders/new"
          className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
        >
          New order
        </Link>
      </div>

      {/* Tabs, not buttons — only one status is ever "on" at a time, so this
          is a view switcher, not an independent multi-toggle filter. Counts
          turn it from "guess and click" into "see what needs attention". */}
      <nav className="flex gap-5 overflow-x-auto border-b border-border text-sm">
        {STATUS_FILTERS.map((status) => {
          const active = status === "all" ? !searchParams.status : searchParams.status === status;
          return (
            <Link
              key={status}
              href={status === "all" ? "/orders" : `/orders?status=${status}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-1 transition-colors",
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{status.replace("_", " ")}</span>
              <span
                className={cn(
                  "tabular rounded-full px-1.5 py-0.5 text-xs",
                  active ? "bg-secondary text-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {counts[status] ?? 0}
              </span>
            </Link>
          );
        })}
      </nav>

      {error && <p className="text-destructive text-sm">Couldn't load orders: {error.message}</p>}

      {/* Table — desktop/tablet. A 5-column table doesn't reflow onto a
          phone width usefully, so it's replaced with cards below md
          instead of just scrolling sideways. */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Order</th>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Total</th>
              <th className="px-4 py-2 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              <tr
                key={order.id}
                className="relative border-t border-border transition-colors hover:bg-secondary/40"
              >
                <td className="px-4 py-2">
                  <Link
                    href={`/orders/${order.id}`}
                    className="tabular font-medium after:absolute after:inset-0 hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </td>
                <td className="px-4 py-2">
                  {order.customer_name ?? (
                    <span className="text-muted-foreground">Not added yet</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-2 text-right tabular">₹{order.total_inr}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
            {orders?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No orders yet — start one from a customer's WhatsApp message.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile. The whole card is a tap target, same "stretched
          link" approach as the desktop row. */}
      <div className="space-y-2 md:hidden">
        {orders?.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between">
              <span className="tabular font-medium">{order.order_number}</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {order.customer_name ?? "Not added yet"}
              </span>
              <span className="tabular font-medium">₹{order.total_inr}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleDateString("en-IN")}
            </div>
          </Link>
        ))}
        {orders?.length === 0 && (
          <p className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No orders yet — start one from a customer's WhatsApp message.
          </p>
        )}
      </div>
    </div>
  );
}
