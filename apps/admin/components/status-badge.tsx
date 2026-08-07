import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  awaiting_payment: "bg-amber/15 text-amber",
  paid: "bg-success/15 text-success",
  shipped: "bg-accent/15 text-accent",
  delivered: "bg-success/25 text-success",
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
