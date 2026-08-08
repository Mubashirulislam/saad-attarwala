"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogFragrance } from "@saad/database";
import { ArrowUp, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SortMode = "brand" | "name" | "price-asc";

const rupee = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

// Smallest-size price, used as the comparable "starting from" figure for
// price sorting — sizes aren't standard across brands, so this is the
// fairest single number to sort on.
function startingPrice(f: CatalogFragrance) {
  const inStock = f.variants.filter((v) => v.in_stock);
  if (inStock.length === 0) return Infinity;
  return Math.min(...inStock.map((v) => v.price_inr));
}

// Every size that exists has been marked out of stock — distinct from a
// fragrance with no sizes entered yet at all, which just isn't priced yet
// rather than sold out.
function isOutOfStock(f: CatalogFragrance) {
  return f.variants.length > 0 && f.variants.every((v) => !v.in_stock);
}

export function CatalogTable({ catalog }: { catalog: CatalogFragrance[] }) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("brand");

  // Union of every size offered anywhere in the catalog, descending —
  // becomes the fixed column set so brands with different size ladders
  // (some go up to 100ml, some stop at 12ml) still line up in one table.
  const sizeColumns = useMemo(() => {
    const sizes = new Set<number>();
    catalog.forEach((f) => f.variants.forEach((v) => sizes.add(v.size_ml)));
    return Array.from(sizes).sort((a, b) => b - a);
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (f) =>
        f.fragrance_name.toLowerCase().includes(q) ||
        f.brand_name.toLowerCase().includes(q)
    );
  }, [catalog, query]);

  const groupedByBrand = useMemo(() => {
    const groups = new Map<string, CatalogFragrance[]>();
    filtered.forEach((f) => {
      const list = groups.get(f.brand_name) ?? [];
      list.push(f);
      groups.set(f.brand_name, list);
    });
    groups.forEach((list) => list.sort((a, b) => a.fragrance_name.localeCompare(b.fragrance_name)));
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Used whenever we're not showing the brand grid: "name" mode, "price-asc"
  // mode, and also as the fallback for "brand" mode once there's an active
  // search — a grid of brand tiles isn't useful once you're looking for one
  // specific attar, so search always drops into this flat, sorted list.
  const flatSorted = useMemo(() => {
    const list = [...filtered];
    if (sortMode === "price-asc") list.sort((a, b) => startingPrice(a) - startingPrice(b));
    else list.sort((a, b) => a.fragrance_name.localeCompare(b.fragrance_name));
    return list;
  }, [filtered, sortMode]);

  const showBrandGrid = sortMode === "brand" && !query.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search an attar or perfume…"
            className="w-full rounded-md border border-input bg-card pl-9 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="relative">
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="w-full appearance-none rounded-md border border-input bg-card pl-3 pr-8 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="brand">Group by brand</option>
            <option value="name">Sort: Name (A–Z)</option>
            <option value="price-asc">Sort: Price (low to high)</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-muted-foreground py-12 text-center">
          Nothing matches "{query}". Try a different spelling or brand name.
        </p>
      )}

      {showBrandGrid ? (
        <>
          {/* Quick-jump tiles — scroll straight to that brand's table below
              instead of navigating away, so you never leave this page. */}
          <BrandGrid groups={groupedByBrand} />
          <div className="space-y-6">
            {groupedByBrand.map(([brandName, fragrances]) => (
              <BrandSection
                key={brandName}
                brandName={brandName}
                slug={fragrances[0]?.brand_slug}
                logoUrl={fragrances[0]?.brand_logo_url ?? null}
                fragrances={fragrances}
              />
            ))}
          </div>
        </>
      ) : (
        flatSorted.length > 0 && (
          <FragranceTable fragrances={flatSorted} sizeColumns={sizeColumns} showBrandColumn />
        )
      )}

      <BackToTop />
    </div>
  );
}

// Floating "back to top" button — only appears once you've scrolled far
// enough that returning to the search/sort controls at the top would
// otherwise mean a long manual scroll back up.
function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 400);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className={cn(
        "fixed bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-parchment shadow-lg transition-opacity",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}

// One tile per brand — click through to that brand's own price list instead
// of scrolling past every brand's full table stacked on one page.
function BrandGrid({ groups }: { groups: [string, CatalogFragrance[]][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {groups.map(([brandName, fragrances]) => {
        const slug = fragrances[0]?.brand_slug;
        const logoUrl = fragrances[0]?.brand_logo_url ?? null;
        return (
          <Link
            key={brandName}
            href={slug ? `#brand-${slug}` : "#"}
            scroll={false}
            onClick={(e) => {
              if (!slug) return;
              e.preventDefault();
              document
                .getElementById(`brand-${slug}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-accent hover:bg-secondary/40"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-14 w-14 rounded-md object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-md bg-secondary" />
            )}
            <div>
              <div className="text-sm font-medium">{brandName}</div>
              <div className="text-xs text-muted-foreground">
                {fragrances.length} attar{fragrances.length === 1 ? "" : "s"}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function BrandSection({
  brandName,
  slug,
  logoUrl,
  fragrances,
}: {
  brandName: string;
  slug?: string;
  logoUrl: string | null;
  fragrances: CatalogFragrance[];
}) {
  // Scoped to just this brand's own sizes, not the union across the whole
  // catalog — a brand that only ever sells 12/6/3ml shouldn't show empty
  // 100ml/50ml columns just because some other brand offers those sizes.
  const sizeColumns = Array.from(
    new Set(fragrances.flatMap((f) => f.variants.map((v) => v.size_ml)))
  ).sort((a, b) => b - a);

  return (
    <section id={slug ? `brand-${slug}` : undefined} className="scroll-mt-20">
      {/* Sticky on every breakpoint — the header travels with you while
          scrolling through that brand's list/table, then gets pushed off by
          the next brand's own sticky header as soon as that section reaches
          the top. */}
      <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center gap-2 bg-background px-4 py-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="h-6 w-6 rounded-sm object-contain" />
        ) : (
          <div className="h-6 w-6 rounded-sm bg-secondary" />
        )}
        <h2 className="font-medium">{brandName}</h2>
      </div>
      <FragranceTable fragrances={fragrances} sizeColumns={sizeColumns} />
    </section>
  );
}

export function FragranceTable({
  fragrances,
  sizeColumns,
  showBrandColumn,
}: {
  fragrances: CatalogFragrance[];
  sizeColumns: number[];
  showBrandColumn?: boolean;
}) {
  return (
    <>
      {/* Table view — desktop / tablet */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Attar / perfume</th>
              {showBrandColumn && <th className="px-4 py-2 font-medium">Brand</th>}
              {sizeColumns.map((size) => (
                <th key={size} className="px-4 py-2 font-medium text-right tabular">
                  {size}ml
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fragrances.map((f, i) => {
              const outOfStock = isOutOfStock(f);
              return (
                <tr
                  key={f.fragrance_id}
                  className={cn(i % 2 === 1 && "bg-card/50", outOfStock && "opacity-60")}
                >
                  <td className="px-4 py-2">
                    {f.fragrance_name}
                    {outOfStock && (
                      <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Out of stock
                      </span>
                    )}
                  </td>
                  {showBrandColumn && (
                    <td className="px-4 py-2 text-muted-foreground">{f.brand_name}</td>
                  )}
                  {sizeColumns.map((size) => {
                    const variant = f.variants.find((v) => v.size_ml === size);
                    return (
                      <td key={size} className="px-4 py-2 text-right tabular">
                        {variant && variant.in_stock ? `₹${rupee(variant.price_inr)}` : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Card view — mobile */}
      <div className="md:hidden space-y-2">
        {fragrances.map((f) => {
          const outOfStock = isOutOfStock(f);
          return (
            <div
              key={f.fragrance_id}
              className={cn(
                "rounded-lg border border-border bg-card p-3",
                outOfStock && "opacity-60"
              )}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{f.fragrance_name}</span>
                {showBrandColumn && (
                  <span className="text-xs text-muted-foreground">{f.brand_name}</span>
                )}
              </div>
              {outOfStock ? (
                <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Out of stock
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {f.variants
                    .filter((v) => v.in_stock)
                    .map((v) => (
                      <span
                        key={v.size_ml}
                        className="rounded-md bg-secondary px-2 py-1 text-xs tabular"
                      >
                        {v.size_ml}ml — ₹{rupee(v.price_inr)}
                      </span>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
