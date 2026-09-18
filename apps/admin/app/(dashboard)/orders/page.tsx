import Link from "next/link";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
// Search and X were only used by the search form below, which is
// commented out for now — re-add `Search, X` here if it comes back.
import { getServerSupabase } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { CollapsibleOnScroll } from "@/components/collapsible-on-scroll";
import { cn, toSentenceCase } from "@/lib/utils";

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

const TREND_RANGE_OPTIONS = [7, 14, 30] as const;
const DEFAULT_TREND_DAYS = 14;

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  total_inr: number;
  created_at: string;
  itemCount: number;
};

// One column per sortable header — `accessor` returns the value to compare,
// `defaultDir` is which direction makes sense the first time you click a
// column (e.g. total_inr should start high-to-low, a name should start
// A-Z), so every column doesn't need an extra click to be useful.
const SORT_COLUMNS: Record<
  string,
  { accessor: (o: OrderRow) => string | number; defaultDir: "asc" | "desc" }
> = {
  order_number: { accessor: (o) => o.order_number, defaultDir: "asc" },
  customer_name: { accessor: (o) => o.customer_name ?? "", defaultDir: "asc" },
  status: { accessor: (o) => o.status, defaultDir: "asc" },
  itemCount: { accessor: (o) => o.itemCount, defaultDir: "desc" },
  total_inr: { accessor: (o) => o.total_inr, defaultDir: "desc" },
  created_at: { accessor: (o) => o.created_at, defaultDir: "desc" },
};

type BuildHref = (
  overrides: Partial<Record<"status" | "trend" | "sort" | "dir" | "q", string>>
) => string;

// Buckets orders into one row per calendar day for the trailing TREND_DAYS
// window (oldest first), so each dashboard card can pull its own daily
// series out of the same pass over `allOrders` instead of re-scanning it
// four times. Days with zero matching orders still get a 0 entry — the
// sparkline needs an even-spaced series, not just the days that happened
// to have activity.
function lastNDaysBuckets(
  orders: { status: string; total_inr: number; created_at: string }[],
  days: number
) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() - (days - 1 - i));
    return { key: date.toDateString(), all: 0, awaiting_payment: 0, shipped: 0, revenue: 0 };
  });
  const indexByKey = new Map(buckets.map((b, i) => [b.key, i]));

  for (const o of orders) {
    const createdDate = new Date(o.created_at);
    createdDate.setHours(0, 0, 0, 0);
    const idx = indexByKey.get(createdDate.toDateString());
    if (idx === undefined) continue; // outside the trailing window
    buckets[idx].all += 1;
    if (o.status === "awaiting_payment") buckets[idx].awaiting_payment += 1;
    if (o.status === "shipped") buckets[idx].shipped += 1;
    if (o.status !== "draft" && o.status !== "cancelled") buckets[idx].revenue += o.total_inr;
  }

  return buckets;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; trend?: string; sort?: string; dir?: string; q?: string };
}) {
  const supabase = getServerSupabase();

  const requestedTrendDays = Number(searchParams.trend);
  const trendDays = (TREND_RANGE_OPTIONS as readonly number[]).includes(requestedTrendDays)
    ? requestedTrendDays
    : DEFAULT_TREND_DAYS;

  // Every status's count, in one query — powers the tab bar below so each
  // tab shows how many orders are in it instead of making you click through
  // blind, and also feeds the summary cards above it. A handful of rows per
  // query even at real volume, cheap either way.
  const { data: allOrders } = await supabase
    .from("orders")
    .select("status, total_inr, created_at");
  const counts: Record<string, number> = { all: allOrders?.length ?? 0 };
  for (const o of allOrders ?? []) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }

  // Revenue for the current calendar month — draft/cancelled orders never
  // became real money, so they're excluded the same way a "sales so far
  // this month" figure would be.
  const now = new Date();
  const revenueThisMonth = (allOrders ?? []).reduce((sum, o) => {
    const createdAt = new Date(o.created_at);
    const inThisMonth =
      createdAt.getFullYear() === now.getFullYear() && createdAt.getMonth() === now.getMonth();
    const counted = o.status !== "draft" && o.status !== "cancelled";
    return inThisMonth && counted ? sum + o.total_inr : sum;
  }, 0);

  const trend = lastNDaysBuckets(allOrders ?? [], trendDays);
  const totalOrdersTrend = trend.map((b) => b.all);
  const awaitingPaymentTrend = trend.map((b) => b.awaiting_payment);
  const shippedTrend = trend.map((b) => b.shipped);
  const revenueTrend = trend.map((b) => b.revenue);

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, status, total_inr, created_at, order_items(quantity)"
    )
    .order("created_at", { ascending: false });

  if (searchParams.status) {
    query = query.eq("status", searchParams.status);
  }

  // Search temporarily disabled — commented out rather than removed so
  // it's a quick uncomment once it's wanted back, not a rebuild.
  // const search = searchParams.q?.trim();
  // if (search) {
  //   // Comma is the condition separator in PostgREST's .or() syntax, so a
  //   // literal comma in the search box would otherwise break the filter
  //   // into unintended extra conditions — strip it rather than escape it,
  //   // since a comma in an order number/name/phone was never meaningful.
  //   const term = search.replace(/[%,]/g, "");
  //   query = query.or(
  //     `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`
  //   );
  // }

  const { data: ordersRaw, error } = await query;

  // Total units across every line item, not just the number of distinct
  // products — an order for "2x Oud Al Mubakhar 6ml" is 2 items, not 1, and
  // that's the number that actually tells you how much packing/checking is
  // involved before it ships.
  const orders: OrderRow[] | undefined = ordersRaw?.map((o) => ({
    ...o,
    itemCount: o.order_items.reduce((sum: number, item: { quantity: number }) => sum + item.quantity, 0),
  }));

  const emptyMessage = searchParams.status
    ? "No orders match this search/filter."
    : "No orders yet — start one from a customer's WhatsApp message.";

  // Sorting happens here, after itemCount is computed, rather than pushing
  // it down to the query — itemCount is a derived sum across a joined
  // table, not a real column, so every sortable column goes through the
  // same in-memory sort for consistency instead of splitting between a
  // DB-level ORDER BY for some columns and a JS sort for others.
  const sortColumn = searchParams.sort && SORT_COLUMNS[searchParams.sort] ? searchParams.sort : "created_at";
  const sortDir: "asc" | "desc" =
    searchParams.dir === "asc" || searchParams.dir === "desc"
      ? searchParams.dir
      : SORT_COLUMNS[sortColumn].defaultDir;
  const { accessor } = SORT_COLUMNS[sortColumn];
  orders?.sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Preserves status/trend/sort/dir together so switching any one control
  // never silently drops another — every filter/sort link below builds its
  // href through this instead of hand-rolling a query string.
  function buildHref(overrides: Partial<Record<"status" | "trend" | "sort" | "dir" | "q", string>>) {
    const params = new URLSearchParams();
    const next = {
      status: searchParams.status,
      trend: trendDays !== DEFAULT_TREND_DAYS ? String(trendDays) : undefined,
      sort: sortColumn !== "created_at" ? sortColumn : undefined,
      dir: searchParams.dir,
      q: searchParams.q,
      ...overrides,
    };
    if (next.status) params.set("status", next.status);
    if (next.trend) params.set("trend", next.trend);
    if (next.sort) params.set("sort", next.sort);
    if (next.dir) params.set("dir", next.dir);
    if (next.q) params.set("q", next.q);
    const qs = params.toString();
    return qs ? `/orders?${qs}` : "/orders";
  }

  return (
    <div className="space-y-4">
      {/* Sticky on mobile only (md:static cancels all of this above md,
          where there's no need to pin anything). top-14 lines up exactly
          with the mobile top bar's fixed h-14 in Sidebar, so this block
          sits flush beneath it rather than overlapping or leaving a gap.
          The KPI section inside is wrapped in CollapsibleOnScroll, which
          fades + collapses it away while scrolling down through the order
          list — so what actually stays pinned in view is just the heading
          and the tabs, with the KPI cards reappearing on the next scroll
          up. A solid bg is required since this now sits on top of
          scrolling content instead of being part of the normal page flow. */}
      <div className="sticky top-14 z-20 space-y-4 bg-background pb-2 md:static md:top-auto md:z-auto md:bg-transparent md:pb-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Orders</h1>
          <Link
            href="/orders/new"
            className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
          >
            New order
          </Link>
        </div>

        <CollapsibleOnScroll>
          {/* Range picker for the sparklines only — the KPI numbers above
              stay all-time (or this-month for revenue) regardless of this,
              so switching it never makes "Total orders" itself look like
              it changed. */}
          <div className="flex items-center justify-end gap-1 text-xs">
            <span className="text-muted-foreground">Trend:</span>
            {TREND_RANGE_OPTIONS.map((days) => {
              const active = days === trendDays;
              return (
                <Link
                  key={days}
                  href={buildHref({ trend: String(days) })}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-2 py-1 font-medium transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {days}D
                </Link>
              );
            })}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DashboardCard label="Total orders" value={counts.all} trend={totalOrdersTrend} />
            <DashboardCard
              label="Awaiting payment"
              value={counts.awaiting_payment ?? 0}
              trend={awaitingPaymentTrend}
            />
            <DashboardCard label="Shipped" value={counts.shipped ?? 0} trend={shippedTrend} />
            <DashboardCard
              label="Revenue"
              value={`₹${revenueThisMonth.toLocaleString("en-IN")}`}
              trend={revenueTrend}
            />
          </div>
        </CollapsibleOnScroll>

      {/* Search — temporarily disabled, commented out (not deleted) for a
          quick restore later. Plain GET form design: a full page reload on
          submit, same as every other filter on this page (status tabs,
          trend range), rather than a client component with debounced
          fetch. Hidden inputs carry the other active filters along so
          searching never resets them.
      <form action="/orders" className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q ?? ""}
            placeholder="Search order #, name, or phone…"
            className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        {searchParams.status && <input type="hidden" name="status" value={searchParams.status} />}
        {trendDays !== DEFAULT_TREND_DAYS && (
          <input type="hidden" name="trend" value={trendDays} />
        )}
        {sortColumn !== "created_at" && <input type="hidden" name="sort" value={sortColumn} />}
        {searchParams.dir && <input type="hidden" name="dir" value={searchParams.dir} />}
        {searchParams.q && (
          <Link
            href={buildHref({ q: undefined })}
            aria-label="Clear search"
            title="Clear search"
            className="flex items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Link>
        )}
      </form>
      */}

      {/* Tabs, not buttons — only one status is ever "on" at a time, so this
          is a view switcher, not an independent multi-toggle filter. Counts
          turn it from "guess and click" into "see what needs attention". */}
      <nav className="flex gap-5 overflow-x-auto border-b border-border text-sm">
        {STATUS_FILTERS.map((status) => {
          const active = status === "all" ? !searchParams.status : searchParams.status === status;
          return (
            <Link
              key={status}
              href={buildHref({ status: status === "all" ? undefined : status })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-1 transition-colors",
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <span>{toSentenceCase(status)}</span>
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
      </div>

      {error && <p className="text-destructive text-sm">Couldn't load orders: {error.message}</p>}

      {/* Table — desktop/tablet. A 5-column table doesn't reflow onto a
          phone width usefully, so it's replaced with cards below md
          instead of just scrolling sideways. Capped height + overflow-y-auto
          so a long order list scrolls inside this box instead of pushing
          the header/cards/tabs above it off-screen; the header row is
          sticky within that scroll area (solid bg, not the translucent /60
          used elsewhere, so scrolling rows don't show through it). */}
      <div className="hidden md:block max-h-[72vh] overflow-y-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-secondary text-left">
            <tr>
              <SortableHeader
                label="Order"
                column="order_number"
                sortColumn={sortColumn}
                sortDir={sortDir}
                buildHref={buildHref}
                className="whitespace-nowrap"
              />
              <SortableHeader
                label="Customer"
                column="customer_name"
                sortColumn={sortColumn}
                sortDir={sortDir}
                buildHref={buildHref}
              />
              <SortableHeader
                label="Status"
                column="status"
                sortColumn={sortColumn}
                sortDir={sortDir}
                buildHref={buildHref}
                className="whitespace-nowrap"
              />
              <SortableHeader
                label="Items"
                column="itemCount"
                sortColumn={sortColumn}
                sortDir={sortDir}
                buildHref={buildHref}
                align="right"
                className="whitespace-nowrap"
              />
              <SortableHeader
                label="Total"
                column="total_inr"
                sortColumn={sortColumn}
                sortDir={sortDir}
                buildHref={buildHref}
                align="right"
                className="whitespace-nowrap"
              />
              <SortableHeader
                label="Placed"
                column="created_at"
                sortColumn={sortColumn}
                sortDir={sortDir}
                buildHref={buildHref}
                className="whitespace-nowrap"
              />
            </tr>
          </thead>
          <tbody>
            {orders?.map((order) => (
              <tr
                key={order.id}
                className="relative border-t border-border transition-colors hover:bg-secondary/40"
              >
                <td className="whitespace-nowrap px-4 py-2">
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
                <td className="whitespace-nowrap px-4 py-2">
                  <StatusBadge status={order.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular text-muted-foreground">
                  {order.itemCount}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular">
                  ₹{order.total_inr}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
            {orders?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {emptyMessage}
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
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(order.created_at).toLocaleDateString("en-IN")}</span>
              <span>
                {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
              </span>
            </div>
          </Link>
        ))}
        {orders?.length === 0 && (
          <p className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}

// A clickable column header — clicking an inactive column sorts by it using
// that column's own sensible default direction (SORT_COLUMNS[column].defaultDir),
// clicking the already-active column flips asc/desc. The icon shows a plain
// up/down affordance on every column so it's discoverable before you've
// clicked anything, and switches to a filled chevron once that column is
// the active sort.
function SortableHeader({
  label,
  column,
  sortColumn,
  sortDir,
  buildHref,
  align = "left",
  className,
}: {
  label: string;
  column: string;
  sortColumn: string;
  sortDir: "asc" | "desc";
  buildHref: BuildHref;
  align?: "left" | "right";
  className?: string;
}) {
  const active = column === sortColumn;
  const nextDir = active ? (sortDir === "asc" ? "desc" : "asc") : SORT_COLUMNS[column].defaultDir;
  const Icon = !active ? ChevronsUpDown : sortDir === "asc" ? ChevronUp : ChevronDown;

  return (
    <th className={cn("px-4 py-2 font-medium", className)}>
      <Link
        href={buildHref({ sort: column, dir: nextDir })}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          active && "text-foreground",
          align === "right" && "w-full justify-end"
        )}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", !active && "text-muted-foreground/50")} />
      </Link>
    </th>
  );
}

// Plain KPI tile — the same numbers already used to build the tab counts
// above, just surfaced as a glanceable summary before you scroll into the
// list itself. No links/interactivity on purpose; this is a status readout,
// not another way to filter (the tabs below already do that). The trend, if
// any, docks to the right of the value at a fixed small size rather than
// stretching full-width — it's there to give a shape at a glance, not to be
// read precisely.
function DashboardCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number;
  trend?: number[];
}) {
  return (
    // Stacked (sparkline below the value) below sm: — the 2-column mobile
    // grid leaves each card too narrow for a 4-5 digit rupee value to share
    // a row with a fixed-width sparkline docked to the right without
    // truncating. From sm: up, back to side-by-side since there's room.
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-xl font-semibold tabular text-foreground">{value}</div>
      </div>
      {trend && <Sparkline id={label} values={trend} />}
    </div>
  );
}

// Small filled-area trend, styled after the compact sparkline shadcn's chart
// examples use inside a stat card: a smoothed curve (Catmull-Rom → cubic
// Bezier, since there's no chart lib here) with a soft gradient fill
// underneath instead of a flat, full-width gray line. Neutral ink tone on
// every card, not colored per-card — this is a shape, not a status signal.
// Fixed small size and docked to one side — it's reading as a shape, not a
// chart with axes, so there are none. The <title> keeps the day-by-day
// figures reachable on hover/focus even without a custom tooltip.
function Sparkline({ id, values }: { id: string; values: number[] }) {
  const width = 72;
  const height = 32;
  const padY = 4;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values.map(
    (v, i) => [i * stepX, height - padY - (v / max) * (height - padY * 2)] as const
  );

  const linePath = smoothPath(points);
  const [firstX] = points[0];
  const [lastX] = points[points.length - 1];
  const areaPath = `${linePath} L${lastX.toFixed(1)},${height} L${firstX.toFixed(1)},${height} Z`;
  const gradientId = `sparkline-fill-${id.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-8 w-[4.5rem] shrink-0 text-muted-foreground"
      role="img"
      aria-label={`Last ${values.length} days: ${values.join(", ")}`}
    >
      <title>{`Last ${values.length} days: ${values.join(", ")}`}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={linePath}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Catmull-Rom → cubic Bezier smoothing (tension 1/6) so a handful of daily
// points reads as a soft curve instead of jagged straight segments — no
// chart library needed for something this small.
function smoothPath(points: readonly (readonly [number, number])[]): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
