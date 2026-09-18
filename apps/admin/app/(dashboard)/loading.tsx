// Shown instantly by Next.js as a Suspense fallback whenever any page under
// this layout is re-fetching from the server — a full navigation between
// Orders/Catalog/Sales, or a searchParams-only change on the same page
// (a status tab, a sort header, the trend range). Without this, the
// previous screen just sits frozen with no feedback for however long the
// Supabase round trip takes, which is what made clicking around feel
// broken rather than merely a little slow. One generic skeleton for every
// route rather than a bespoke one per page — it only needs to read as
// "something is happening," not match the destination pixel-for-pixel.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-28 rounded bg-secondary" />
        <div className="h-9 w-28 rounded-md bg-secondary" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-card" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}
