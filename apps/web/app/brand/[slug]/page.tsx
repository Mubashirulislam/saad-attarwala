import { notFound } from "next/navigation";
import Link from "next/link";
import { createPublicSupabaseClient, getCatalog } from "@saad/database";
import { FragranceTable } from "@/components/catalog-table";

export const revalidate = 60;

export default async function BrandPage({ params }: { params: { slug: string } }) {
  const supabase = createPublicSupabaseClient();
  const catalog = await getCatalog(supabase);

  const fragrances = catalog
    .filter((f) => f.brand_slug === params.slug)
    .sort((a, b) => a.fragrance_name.localeCompare(b.fragrance_name));

  if (fragrances.length === 0) notFound();

  const { brand_name: brandName, brand_logo_url: logoUrl } = fragrances[0];

  const sizeColumns = Array.from(
    new Set(fragrances.flatMap((f) => f.variants.map((v) => v.size_ml)))
  ).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← All brands
      </Link>

      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-12 w-12 rounded-md object-contain" />
        ) : (
          <div className="h-12 w-12 rounded-md bg-secondary" />
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{brandName}</h1>
      </div>

      <FragranceTable fragrances={fragrances} sizeColumns={sizeColumns} />
    </div>
  );
}
