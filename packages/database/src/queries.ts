import type { PostgrestResponse, SupabaseClient } from "@supabase/supabase-js";
import type { CatalogFragrance, FragranceSearchResult } from "./types";

const PAGE_SIZE = 1000;

// Supabase's REST API caps any single response at 1000 rows (the project's
// Max Rows setting) — a plain .select() silently returns a truncated result
// once a table passes that size instead of erroring, so every unbounded
// catalog read has to page through .range() instead. Do not "simplify" this
// back to a single .select().
async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PostgrestResponse<T>>
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

// India-local calendar date (YYYY-MM-DD). Sale start/end dates are meant as
// IST calendar days ("Independence Day" = Aug 15 IST) — comparing against a
// UTC-computed "today" could be off by up to ~5.5 hours at day boundaries,
// since the server this runs on is in UTC.
function todayIST(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Public catalog read — powers pakeeza-perfume-web.vercel.app.
 * Returns every fragrance with its brand info and full variant ladder,
 * so the client can group by brand and pivot sizes into columns. Each
 * variant's sale price (if any currently-active sale applies) is computed
 * here, once, so nothing downstream needs to know about sale date ranges.
 *
 * TODO(claude-code): this is a naive multi-query join for readability
 * during scaffolding. Once the shape is confirmed, replace with a single
 * `.select("*, fragrances(*, variants(*))")` nested query or a Postgres
 * view (e.g. `catalog_view`) for one round trip.
 */
export async function getCatalog(supabase: SupabaseClient): Promise<CatalogFragrance[]> {
  const brands = await fetchAllRows((from, to) =>
    supabase.from("brands").select("id, name, slug, logo_url").range(from, to)
  );

  const fragrances = await fetchAllRows((from, to) =>
    supabase.from("fragrances").select("id, name, brand_id").range(from, to)
  );

  const variants = await fetchAllRows((from, to) =>
    supabase
      .from("variants")
      .select("fragrance_id, size_ml, price_inr, in_stock")
      .range(from, to)
  );

  const today = todayIST();
  const { data: sales, error: salesError } = await supabase
    .from("sales")
    .select("name, discount_percent, brand_id")
    .lte("starts_at", today)
    .gte("ends_at", today);
  if (salesError) throw salesError;

  const brandById = new Map(brands.map((b) => [b.id, b]));

  // The best (highest-discount) currently-active sale for a brand — checks
  // brand-specific sales first, falls back to sitewide ones (brand_id
  // null). If more than one happens to be running, the customer always
  // sees the better deal rather than an arbitrary pick.
  function bestSaleForBrand(brandId: string) {
    const applicable = (sales ?? []).filter((s) => s.brand_id === brandId || s.brand_id === null);
    if (applicable.length === 0) return null;
    return applicable.reduce((best, s) => (s.discount_percent > best.discount_percent ? s : best));
  }

  return fragrances.map((f) => {
    const brand = brandById.get(f.brand_id);
    const sale = bestSaleForBrand(f.brand_id);

    return {
      fragrance_id: f.id,
      fragrance_name: f.name,
      brand_id: f.brand_id,
      brand_name: brand?.name ?? "Unknown brand",
      brand_slug: brand?.slug ?? f.brand_id,
      brand_logo_url: brand?.logo_url ?? null,
      variants: variants
        .filter((v) => v.fragrance_id === f.id)
        .sort((a, b) => b.size_ml - a.size_ml)
        .map((v) => ({
          size_ml: v.size_ml,
          price_inr: v.price_inr,
          in_stock: v.in_stock,
          sale_price_inr: sale ? Math.round(v.price_inr * (1 - sale.discount_percent / 100)) : null,
          sale_name: sale?.name ?? null,
          sale_discount_percent: sale?.discount_percent ?? null,
        })),
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
