import { cn } from "@/lib/utils";

// paid and delivered share the success hue on purpose (both are "good"
// outcomes, per the brand palette) — but a light tint vs a slightly darker
// tint of the same color read as near-identical at badge size. delivered
// gets a solid fill instead, since it's the final state; that keeps the two
// visually distinct without introducing a new hue for one more status.
const styles: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  awaiting_payment: "bg-amber/15 text-amber",
  paid: "bg-success/15 text-success",
  shipped: "bg-accent/15 text-accent",
  delivered: "bg-success text-success-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        styles[status] ?? styles.draft
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
