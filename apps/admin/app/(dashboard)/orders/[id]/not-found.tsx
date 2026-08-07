import Link from "next/link";

export default function OrderNotFound() {
  return (
    <div className="max-w-sm space-y-3">
      <h1 className="text-lg font-semibold">Order not found</h1>
      <p className="text-sm text-muted-foreground">
        This order doesn't exist, or it's been deleted.
      </p>
      <Link
        href="/orders"
        className="inline-block rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
      >
        Back to orders
      </Link>
    </div>
  );
}
