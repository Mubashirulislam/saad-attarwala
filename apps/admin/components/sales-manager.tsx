"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

interface BrandOption {
  id: string;
  name: string;
}

interface SaleRow {
  id: string;
  name: string;
  discount_percent: number;
  brand_id: string | null;
  starts_at: string;
  ends_at: string;
}

// Plain UTC date is fine here — this is just for showing "active / upcoming
// / ended" in the admin list, not for computing actual discounted prices
// (that's todayIST() in packages/database, which matters for correctness on
// the public site). A few hours of drift on this label isn't worth caring
// about.
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function saleStatus(sale: SaleRow): "upcoming" | "active" | "ended" {
  const today = todayStr();
  if (today < sale.starts_at) return "upcoming";
  if (today > sale.ends_at) return "ended";
  return "active";
}

const STATUS_STYLES: Record<string, string> = {
  upcoming: "bg-secondary text-secondary-foreground",
  active: "bg-success/15 text-success",
  ended: "bg-secondary text-muted-foreground",
};

export function SalesManager({
  initialSales,
  brands,
}: {
  initialSales: SaleRow[];
  brands: BrandOption[];
}) {
  const [sales, setSales] = useState(initialSales);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SaleRow | null>(null);

  function handleSaved(sale: SaleRow) {
    setSales((prev) => {
      const exists = prev.some((s) => s.id === sale.id);
      const next = exists ? prev.map((s) => (s.id === sale.id ? sale : s)) : [sale, ...prev];
      return [...next].sort((a, b) => (a.starts_at < b.starts_at ? 1 : -1));
    });
    setShowForm(false);
    setEditing(null);
  }

  function handleDeleted(id: string) {
    setSales((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-4">
      {showForm ? (
        <SaleForm
          brands={brands}
          sale={editing}
          onSaved={handleSaved}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
        >
          New sale
        </button>
      )}

      <div className="space-y-2">
        {sales.length === 0 && (
          <p className="rounded-lg border border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No sales yet — create one above to discount a brand (or everything)
            for a set date range.
          </p>
        )}
        {sales.map((sale) => (
          <SaleRowItem
            key={sale.id}
            sale={sale}
            brandName={brands.find((b) => b.id === sale.brand_id)?.name ?? "All brands"}
            onEdit={() => {
              setEditing(sale);
              setShowForm(true);
            }}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  );
}

function SaleRowItem({
  sale,
  brandName,
  onEdit,
  onDeleted,
}: {
  sale: SaleRow;
  brandName: string;
  onEdit: () => void;
  onDeleted: (id: string) => void;
}) {
  const showToast = useToast();
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const status = saleStatus(sale);

  async function deleteSale() {
    setDeleting(true);
    const { error } = await supabaseBrowser.from("sales").delete().eq("id", sale.id);
    setDeleting(false);
    setConfirmingDelete(false);
    if (error) return showToast(error.message, "error");
    onDeleted(sale.id);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{sale.name}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              STATUS_STYLES[status]
            )}
          >
            {status}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {brandName} · <span className="tabular">{sale.discount_percent}%</span> off ·{" "}
          <span className="tabular">{sale.starts_at}</span> –{" "}
          <span className="tabular">{sale.ends_at}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={onEdit}
          aria-label={`Edit ${sale.name}`}
          title="Edit"
          className="p-1 text-muted-foreground hover:text-accent"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setConfirmingDelete(true)}
          disabled={deleting}
          aria-label={`Delete ${sale.name}`}
          title="Delete"
          className="p-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete "${sale.name}"?`}
        description="Prices go back to normal immediately once this is deleted."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={deleteSale}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

function SaleForm({
  brands,
  sale,
  onSaved,
  onCancel,
}: {
  brands: BrandOption[];
  sale: SaleRow | null;
  onSaved: (sale: SaleRow) => void;
  onCancel: () => void;
}) {
  const showToast = useToast();
  const [name, setName] = useState(sale?.name ?? "");
  const [percent, setPercent] = useState(sale ? String(sale.discount_percent) : "");
  const [brandId, setBrandId] = useState(sale?.brand_id ?? "");
  const [startsAt, setStartsAt] = useState(sale?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(sale?.ends_at ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmedName = name.trim();
    const discountPercent = Number(percent);
    if (!trimmedName) return showToast("Give the sale a name.", "error");
    if (!discountPercent || discountPercent <= 0 || discountPercent > 100) {
      return showToast("Discount has to be between 1 and 100%.", "error");
    }
    if (!startsAt || !endsAt) return showToast("Pick a start and end date.", "error");
    if (endsAt < startsAt) return showToast("End date can't be before the start date.", "error");

    setSaving(true);
    const payload = {
      name: trimmedName,
      discount_percent: discountPercent,
      brand_id: brandId || null,
      starts_at: startsAt,
      ends_at: endsAt,
    };

    const { data, error } = sale
      ? await supabaseBrowser.from("sales").update(payload).eq("id", sale.id).select().single()
      : await supabaseBrowser.from("sales").insert(payload).select().single();

    setSaving(false);
    if (error) return showToast(error.message, "error");
    onSaved(data);
  }

  return (
    <div className="space-y-3 rounded-lg border border-accent bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">Sale name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Independence Day Sale"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">Discount %</label>
          <input
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="e.g. 15"
            inputMode="decimal"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm tabular outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-muted-foreground">Brand</label>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-xs text-muted-foreground">Starts</label>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm tabular outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-muted-foreground">Ends</label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-2 py-2 text-sm tabular outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : sale ? "Save changes" : "Create sale"}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
