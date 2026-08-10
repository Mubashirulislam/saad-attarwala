import { getServerSupabase } from "@/lib/supabase/server";
import { SalesManager } from "@/components/sales-manager";

export default async function SalesPage() {
  const supabase = getServerSupabase();

  const { data: brands } = await supabase.from("brands").select("id, name").order("name");
  const { data: sales } = await supabase
    .from("sales")
    .select("id, name, discount_percent, brand_id, starts_at, ends_at")
    .order("starts_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Sales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          A time-boxed percentage discount, on one brand or across everything.
          Prices update on the public site automatically while a sale is running
          — no need to touch anything in the catalog itself.
        </p>
      </div>
      <SalesManager initialSales={sales ?? []} brands={brands ?? []} />
    </div>
  );
}
