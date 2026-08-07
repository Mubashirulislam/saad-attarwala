import type { SupabaseClient } from "@supabase/supabase-js";
import type { CatalogFragrance, FragranceSearchResult } from "./types";

/**
 * Public catalog read — powers saadswebsite.in.
 * Returns every fragrance with its brand info and full variant ladder,
 * so the client can group by brand and pivot sizes into columns.
 *
 * TODO(claude-code): this is a naive 3-query join for readability during
 * scaffolding. Once the shape is confirmed, replace with a single
 * `.select("*, fragrances(*, variants(*))")` nested query or a Postgres
 * view (e.g. `catalog_view`) for one round trip.
 */
export async function getCatalog(supabase: SupabaseClient): Promise<CatalogFragrance[]> {
  const { data: brands, error: brandsError } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url");
  if (brandsError) throw brandsError;

  const { data: fragrances, error: fragrancesError } = await supabase
    .from("fragrances")
    .select("id, name, brand_id");
  if (fragrancesError) throw fragrancesError;

  const { data: variants, error: variantsError } = await supabase
    .from("variants")
    .select("fragrance_id, size_ml, price_inr, in_stock");
  if (variantsError) throw variantsError;

  const brandById = new Map(brands.map((b) => [b.id, b]));

  return fragrances.map((f) => {
    const brand = brandById.get(f.brand_id);
    return {
      fragrance_id: f.id,
      fragrance_name: f.name,
      brand_id: f.brand_id,
      brand_name: brand?.name ?? "Unknown brand",
      brand_slug: brand?.slug ?? f.brand_id,
      brand_logo_url: brand?.logo_url ?? null,
      variants: variants
        .filter((v) => v.fragrance_id === f.id)
        .sort((a, b) => b.size_ml - a.size_ml),
    };
  });
}

/**
 * Admin "type an attar name" search — powers the order-builder combobox.
 * Deliberately surfaces brand name alongside each match since the same
 * fragrance name can exist under multiple brands (e.g. two brands both
 * selling a "Ruh Khus No. 1").
 *
 * TODO(claude-code): swap ilike for the pg_trgm similarity search once
 * the fragrances_name_trgm_idx index (see migration) is in place —
 * ilike is fine for now but trigram search handles typos/partial words
 * better for a fast-typing admin flow.
 */
export async function searchFragrances(
  supabase: SupabaseClient,
  query: string
): Promise<FragranceSearchResult[]> {
  if (!query.trim()) return [];

  const { data, error } = await supabase
    .from("fragrances")
    .select("id, name, brand:brands(name), variants(id, size_ml, price_inr, in_stock)")
    .ilike("name", `%${query}%`)
    .limit(15);
  if (error) throw error;

  return data.map((row: any) => ({
    fragrance_id: row.id,
    fragrance_name: row.name,
    brand_name: row.brand?.name ?? "Unknown brand",
    variants: row.variants ?? [],
  }));
}
