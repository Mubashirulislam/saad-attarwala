import { getServerSupabase } from "@/lib/supabase/server";
import { CatalogManager } from "@/components/catalog-manager";

export default async function CatalogPage() {
  const supabase = getServerSupabase();

  const { data: brands } = await supabase
    .from("brands")
    .select("id, name, origin, logo_url")
    .order("name");
  const { data: fragrances } = await supabase
    .from("fragrances")
    .select("id, name, brand_id");
  const { data: variants } = await supabase
    .from("variants")
    .select("id, fragrance_id, size_ml, price_inr, in_stock");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Catalog</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add a brand, then the attars under it, then the sizes and prices
          for each. Everything here shows up on the customer site as soon as
          you save.
        </p>
      </div>
      <CatalogManager
        initialBrands={brands ?? []}
        initialFragrances={fragrances ?? []}
        initialVariants={variants ?? []}
      />
    </div>
  );
}
