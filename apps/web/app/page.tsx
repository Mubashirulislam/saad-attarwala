import { createPublicSupabaseClient, getCatalog } from "@saad/database";
import { CatalogTable } from "@/components/catalog-table";

// Revalidate on a short interval as a safety net. The admin app also calls
// POST /api/revalidate after every save, so most updates show up instantly —
// this ISR window just covers any edge case where that call doesn't fire.
export const revalidate = 60;

export default async function CatalogPage() {
  const supabase = createPublicSupabaseClient();
  const catalog = await getCatalog(supabase);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Price list</h1>
        <p className="text-muted-foreground mt-1">
          Search or sort below, then message Saad on WhatsApp with what you'd
          like and how much — he'll confirm the total including delivery.
        </p>
      </div>
      <CatalogTable catalog={catalog} />
    </div>
  );
}
