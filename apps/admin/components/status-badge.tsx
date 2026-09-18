import { cn, toSentenceCase } from "@/lib/utils";

// One consistent recipe for every status — same pill shape, same weight,
// same background opacity (15%) — so the set reads as one coherent system
// instead of a mix of solid fills, pale tints, and outlines. Color is the
// only thing that varies between them. `shipped` uses ink (a brand-neutral,
// not one of the semantic status hues) rather than accent, since accent IS
// amber in this design system (see tailwind.config.ts) and would otherwise
// collide with awaiting_payment.
const styles: Record<string, string> = {
  draft: "bg-secondary text-secondary-foreground",
  awaiting_payment: "bg-amber/15 text-amber",
  paid: "bg-success/15 text-success",
  shipped: "bg-ink/10 text-ink",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        styles[status] ?? styles.draft
      )}
    >
      {toSentenceCase(status)}
    </span>
  );
}
