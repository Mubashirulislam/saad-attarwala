"use client";

import { useRef, useState } from "react";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

interface BrandRow {
  id: string;
  name: string;
  origin: string | null;
  logo_url: string | null;
}
interface FragranceRow {
  id: string;
  name: string;
  brand_id: string;
}
interface VariantRow {
  id: string;
  fragrance_id: string;
  size_ml: number;
  price_inr: number;
  in_stock: boolean;
}

// Tells the public catalog to update immediately instead of waiting for
// its 60s ISR window. Safe to no-op if the URL isn't configured yet.
async function notifyPublicSite() {
  const url = process.env.NEXT_PUBLIC_WEB_APP_URL;
  if (!url) return;
  try {
    await fetch(`${url}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidate-secret": process.env.NEXT_PUBLIC_REVALIDATE_SECRET ?? "" },
    });
  } catch {
    // Non-critical — the 60s ISR window on the web app is the fallback.
  }
}

export function CatalogManager({
  initialBrands,
  initialFragrances,
  initialVariants,
}: {
  initialBrands: BrandRow[];
  initialFragrances: FragranceRow[];
  initialVariants: VariantRow[];
}) {
  const [brands, setBrands] = useState(initialBrands);
  const [fragrances, setFragrances] = useState(initialFragrances);
  const [variants, setVariants] = useState(initialVariants);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newBrandName, setNewBrandName] = useState("");
  const showToast = useToast();

  async function addBrand() {
    const name = newBrandName.trim();
    if (!name) return;
    const { data, error } = await supabaseBrowser
      .from("brands")
      .insert({ name, slug: slugify(name) })
      .select()
      .single();
    if (error) return showToast(error.message, "error");
    setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewBrandName("");
    notifyPublicSite();
  }

  function handleFragranceDeleted(fragranceId: string) {
    setFragrances((prev) => prev.filter((f) => f.id !== fragranceId));
    setVariants((prev) => prev.filter((v) => v.fragrance_id !== fragranceId));
    notifyPublicSite();
  }

  function handleBrandUpdated(updated: BrandRow) {
    setBrands((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    notifyPublicSite();
  }

  function handleVariantUpdated(updated: VariantRow) {
    setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    notifyPublicSite();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 max-w-sm">
        <input
          value={newBrandName}
          onChange={(e) => setNewBrandName(e.target.value)}
          placeholder="New brand name, e.g. Ajmal"
          className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          onClick={addBrand}
          className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
        >
          Add brand
        </button>
      </div>

      <div className="space-y-2">
        {brands.map((brand) => (
          <BrandCard
            key={brand.id}
            brand={brand}
            fragrances={fragrances.filter((f) => f.brand_id === brand.id)}
            variants={variants}
            expanded={expanded === brand.id}
            onToggle={() => setExpanded(expanded === brand.id ? null : brand.id)}
            onFragranceAdded={(f) => {
              setFragrances((prev) => [...prev, f]);
              notifyPublicSite();
            }}
            onFragranceDeleted={handleFragranceDeleted}
            onVariantAdded={(v) => {
              setVariants((prev) => [...prev, v]);
              notifyPublicSite();
            }}
            onVariantUpdated={handleVariantUpdated}
            onBrandUpdated={handleBrandUpdated}
          />
        ))}
      </div>
    </div>
  );
}

function BrandCard({
  brand,
  fragrances,
  variants,
  expanded,
  onToggle,
  onFragranceAdded,
  onFragranceDeleted,
  onVariantAdded,
  onVariantUpdated,
  onBrandUpdated,
}: {
  brand: BrandRow;
  fragrances: FragranceRow[];
  variants: VariantRow[];
  expanded: boolean;
  onToggle: () => void;
  onFragranceAdded: (f: FragranceRow) => void;
  onFragranceDeleted: (fragranceId: string) => void;
  onVariantAdded: (v: VariantRow) => void;
  onVariantUpdated: (v: VariantRow) => void;
  onBrandUpdated: (b: BrandRow) => void;
}) {
  const [newFragranceName, setNewFragranceName] = useState("");
  const [editingDetails, setEditingDetails] = useState(false);
  const showToast = useToast();

  async function addFragrance() {
    const name = newFragranceName.trim();
    if (!name) return;
    const { data, error } = await supabaseBrowser
      .from("fragrances")
      .insert({ name, brand_id: brand.id, slug: slugify(name) })
      .select()
      .single();
    if (error) return showToast(error.message, "error");
    onFragranceAdded(data);
    setNewFragranceName("");
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-3 px-4 py-3">
        <BrandLogo brand={brand} />
        <button onClick={onToggle} className="flex-1 flex items-center justify-between text-left">
          <span className="font-medium text-sm">{brand.name}</span>
          <span className="text-xs text-muted-foreground">
            {fragrances.length} attar{fragrances.length === 1 ? "" : "s"}
          </span>
        </button>
        <button
          onClick={() => setEditingDetails((prev) => !prev)}
          aria-label={`Edit ${brand.name}`}
          title="Edit brand name / origin"
          className={cn(
            "shrink-0 text-muted-foreground hover:text-accent",
            editingDetails && "text-accent"
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {editingDetails && (
        <div className="border-t border-border p-3">
          <BrandDetailsEditForm
            brand={brand}
            onLogoUpdated={onBrandUpdated}
            onSaved={(b) => {
              onBrandUpdated(b);
              setEditingDetails(false);
            }}
            onCancel={() => setEditingDetails(false)}
          />
        </div>
      )}

      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {fragrances.map((f) => (
            <FragranceRowEditor
              key={f.id}
              fragrance={f}
              variants={variants.filter((v) => v.fragrance_id === f.id)}
              onVariantAdded={onVariantAdded}
              onVariantUpdated={onVariantUpdated}
              onFragranceDeleted={onFragranceDeleted}
            />
          ))}

          <div className="flex gap-2 max-w-sm pt-2">
            <input
              value={newFragranceName}
              onChange={(e) => setNewFragranceName(e.target.value)}
              placeholder="New attar name, e.g. Ruh Khus No 1"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              onClick={addFragrance}
              className="rounded-md bg-secondary text-secondary-foreground px-3 py-2 text-sm font-medium"
            >
              Add attar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline edit for a brand's photo, name and origin together, opened via the
// pencil icon in BrandCard's header. The logo swaps out immediately on
// selection (image upload doesn't need a Save click), while name/origin
// wait for the Save button below. Regenerates the slug from the new name on
// save so it never drifts out of sync — nothing in either app links to
// brands by slug yet, so there's no URL to break by changing it.
function BrandDetailsEditForm({
  brand,
  onLogoUpdated,
  onSaved,
  onCancel,
}: {
  brand: BrandRow;
  onLogoUpdated: (b: BrandRow) => void;
  onSaved: (b: BrandRow) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(brand.name);
  const [origin, setOrigin] = useState(brand.origin ?? "");
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    const { data, error } = await supabaseBrowser
      .from("brands")
      .update({
        name: trimmedName,
        slug: slugify(trimmedName),
        origin: origin.trim() || null,
      })
      .eq("id", brand.id)
      .select()
      .single();
    setSaving(false);
    if (error) return showToast(error.message, "error");
    onSaved(data);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <span className="block h-4 text-xs leading-4 text-muted-foreground">Photo</span>
        <BrandLogo brand={brand} editable onUpdated={onLogoUpdated} />
      </div>
      <div className="space-y-1">
        <label className="block h-4 text-xs leading-4 text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block h-9 w-40 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <div className="space-y-1">
        <label className="block h-4 text-xs leading-4 text-muted-foreground">Origin</label>
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="e.g. Dubai, UAE"
          className="block h-9 w-40 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="h-9 rounded-md bg-primary text-primary-foreground px-3 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        onClick={onCancel}
        className="h-9 px-1 text-sm text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}

// A brand's logo thumbnail. Static (`editable` unset/false) for the
// always-visible header row; pass `editable` to make it a click-to-upload
// control instead, used inside BrandDetailsEditForm. Uploads go straight to
// the public "brand-logos" Storage bucket (see
// supabase/migrations/0002_brand_logo_storage.sql), then write the returned
// public URL onto brands.logo_url — the same column the web app's catalog
// table already reads for each brand's <img>.
function BrandLogo({
  brand,
  editable,
  onUpdated,
}: {
  brand: BrandRow;
  editable?: boolean;
  onUpdated?: (b: BrandRow) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const showToast = useToast();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Logo needs to be an image file.", "error");
      return;
    }

    setUploading(true);

    const path = `${brand.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseBrowser.storage
      .from("brand-logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setUploading(false);
      return showToast(uploadError.message, "error");
    }

    const {
      data: { publicUrl },
    } = supabaseBrowser.storage.from("brand-logos").getPublicUrl(path);

    const { data, error } = await supabaseBrowser
      .from("brands")
      .update({ logo_url: publicUrl })
      .eq("id", brand.id)
      .select()
      .single();

    setUploading(false);
    if (error) return showToast(error.message, "error");
    onUpdated?.(data);
  }

  const thumbnail = (
    <>
      {brand.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logo_url} alt="" className="h-full w-full object-contain" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-muted-foreground">
          <ImagePlus className="h-4 w-4" />
        </span>
      )}
      {uploading && (
        <span className="absolute inset-0 flex items-center justify-center bg-card/80 text-[10px] text-muted-foreground">
          …
        </span>
      )}
    </>
  );

  if (!editable) {
    return (
      <span className="relative shrink-0 flex h-9 w-9 rounded-md border border-border bg-card overflow-hidden">
        {thumbnail}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        inputRef.current?.click();
      }}
      disabled={uploading}
      title={brand.logo_url ? "Click to replace logo" : "Click to upload a logo"}
      className="relative shrink-0 h-9 w-9 rounded-md border border-border bg-card overflow-hidden disabled:opacity-50"
    >
      {thumbnail}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </button>
  );
}

function FragranceRowEditor({
  fragrance,
  variants,
  onVariantAdded,
  onVariantUpdated,
  onFragranceDeleted,
}: {
  fragrance: FragranceRow;
  variants: VariantRow[];
  onVariantAdded: (v: VariantRow) => void;
  onVariantUpdated: (v: VariantRow) => void;
  onFragranceDeleted: (fragranceId: string) => void;
}) {
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const showToast = useToast();

  async function addVariant() {
    const sizeMl = Number(size);
    const priceInr = Number(price);
    if (!sizeMl || !priceInr) return;
    const { data, error } = await supabaseBrowser
      .from("variants")
      .insert({ fragrance_id: fragrance.id, size_ml: sizeMl, price_inr: priceInr })
      .select()
      .single();
    if (error) return showToast(error.message, "error");
    onVariantAdded(data);
    setSize("");
    setPrice("");
  }

  async function deleteFragrance() {
    setDeleting(true);
    const { error } = await supabaseBrowser.from("fragrances").delete().eq("id", fragrance.id);
    setDeleting(false);
    setConfirmingDelete(false);
    if (error) {
      // Most likely cause: this fragrance has a variant referenced by an
      // existing order (order_items.variant_id has no cascade on purpose,
      // see supabase/migrations/0001_init.sql), so the DB refuses the delete.
      return showToast(error.message, "error");
    }
    onFragranceDeleted(fragrance.id);
  }

  const sortedVariants = [...variants].sort((a, b) => b.size_ml - a.size_ml);
  const editingVariant = sortedVariants.find((v) => v.id === editingVariantId) ?? null;

  return (
    <div className="rounded-md bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{fragrance.name}</span>
        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1.5 justify-end">
            {sortedVariants.map((v) => (
              <button
                key={v.id}
                onClick={() => setEditingVariantId(v.id)}
                title="Click to edit this size"
                className={cn(
                  "rounded bg-card border px-2 py-0.5 text-xs tabular hover:border-accent",
                  v.id === editingVariantId ? "border-accent" : "border-border"
                )}
              >
                {v.size_ml}ml · ₹{v.price_inr}
              </button>
            ))}
          </div>
          <button
            onClick={() => setConfirmingDelete(true)}
            disabled={deleting}
            aria-label={`Delete ${fragrance.name}`}
            title="Delete this attar"
            className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete "${fragrance.name}"?`}
        description="This removes it and all its sizes. This can't be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={deleteFragrance}
        onCancel={() => setConfirmingDelete(false)}
      />

      {/* Own full-width row rather than sitting inline among the pills above —
          two inputs plus Save/Cancel squeezed into a single pill wrapped
          badly on narrow screens. */}
      {editingVariant && (
        <VariantEditForm
          key={editingVariant.id}
          variant={editingVariant}
          onSaved={(v) => {
            onVariantUpdated(v);
            setEditingVariantId(null);
          }}
          onCancel={() => setEditingVariantId(null)}
        />
      )}

      <div className="flex flex-wrap gap-2 mt-2">
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Size (ml)"
          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-xs tabular"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price (₹)"
          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-xs tabular"
        />
        <button
          onClick={addVariant}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-card"
        >
          Add size
        </button>
      </div>
    </div>
  );
}

// Editing form for a saved size/price — this is the only way to correct a
// variant once it's saved (e.g. "12ml for 450" priced wrong), since the
// insert-only "Add size" row elsewhere in this file can't touch existing
// rows. Laid out the same way as "Add size" (labeled inputs + button in a
// wrapping flex row) so it holds up at mobile widths instead of squeezing
// into a pill.
function VariantEditForm({
  variant,
  onSaved,
  onCancel,
}: {
  variant: VariantRow;
  onSaved: (v: VariantRow) => void;
  onCancel: () => void;
}) {
  const [size, setSize] = useState(String(variant.size_ml));
  const [price, setPrice] = useState(String(variant.price_inr));
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  async function save() {
    const sizeMl = Number(size);
    const priceInr = Number(price);
    if (!sizeMl || !priceInr) return;
    setSaving(true);
    const { data, error } = await supabaseBrowser
      .from("variants")
      .update({ size_ml: sizeMl, price_inr: priceInr })
      .eq("id", variant.id)
      .select()
      .single();
    setSaving(false);
    if (error) return showToast(error.message, "error");
    onSaved(data);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 rounded-md border border-accent bg-card p-2">
      <input
        value={size}
        onChange={(e) => setSize(e.target.value)}
        placeholder="Size (ml)"
        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-xs tabular"
      />
      <input
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price (₹)"
        className="w-24 rounded-md border border-input bg-background px-2 py-1 text-xs tabular"
      />
      <button
        onClick={save}
        disabled={saving}
        className="rounded-md bg-primary text-primary-foreground px-2.5 py-1 text-xs font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      <button
        onClick={onCancel}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Cancel
      </button>
    </div>
  );
}
