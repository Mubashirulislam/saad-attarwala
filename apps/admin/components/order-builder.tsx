"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { searchFragrances, type FragranceSearchResult } from "@saad/database";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/toast";

interface LineItem {
  key: string;
  variantId: string;
  brandName: string;
  fragranceName: string;
  sizeMl: number;
  unitPrice: number;
  quantity: number;
}

const rupee = (n: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
const DELIVERY_FEE = 100;

export function OrderBuilder() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FragranceSearchResult[]>([]);
  const [selected, setSelected] = useState<FragranceSearchResult | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const showToast = useToast();

  // Debounced search-as-you-type against the fragrances table.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const found = await searchFragrances(supabaseBrowser, query);
      setResults(found);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function addLineItem(variant: FragranceSearchResult["variants"][number], quantity: number) {
    if (!selected) return;
    setItems((prev) => [
      ...prev,
      {
        key: `${variant.id}-${Date.now()}`,
        variantId: variant.id,
        brandName: selected.brand_name,
        fragranceName: selected.fragrance_name,
        sizeMl: variant.size_ml,
        unitPrice: variant.price_inr,
        quantity,
      },
    ]);
    setSelected(null);
    setQuery("");
    setResults([]);
  }

  function removeLineItem(key: string) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = subtotal + (items.length > 0 ? DELIVERY_FEE : 0);

  async function saveOrder() {
    if (items.length === 0) return;
    setSaving(true);

    const { data: order, error: orderError } = await supabaseBrowser
      .from("orders")
      .insert({ status: "awaiting_payment", delivery_fee_inr: DELIVERY_FEE })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      setSaving(false);
      showToast(`Couldn't create the order: ${orderError?.message}`, "error");
      return;
    }

    const { error: itemsError } = await supabaseBrowser.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        variant_id: item.variantId,
        brand_name_snapshot: item.brandName,
        fragrance_name_snapshot: item.fragranceName,
        size_ml_snapshot: item.sizeMl,
        unit_price_inr_snapshot: item.unitPrice,
        quantity: item.quantity,
        line_total_inr: item.unitPrice * item.quantity,
      }))
    );

    setSaving(false);

    if (itemsError) {
      showToast(
        `Order ${order.order_number} was created but items failed to save: ${itemsError.message}`,
        "error"
      );
      return;
    }

    // TODO(claude-code): build /orders/[id] to show the screenshot-ready
    // summary card, the mark-as-paid action, and the shipping/tracking form.
    router.push(`/orders/${order.id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Type an attar name, e.g. Ruh Khus No 1…"
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {results.length > 0 && !selected && (
            <ul className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-md max-h-64 overflow-y-auto">
              {results.map((result) => (
                <li key={result.fragrance_id}>
                  <button
                    onClick={() => setSelected(result)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center justify-between"
                  >
                    <span>{result.fragrance_name}</span>
                    <span className="text-xs text-muted-foreground">{result.brand_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selected && (
          <SizePicker
            result={selected}
            onAdd={addLineItem}
            onCancel={() => {
              setSelected(null);
              setQuery("");
            }}
          />
        )}

        <div className="rounded-lg border border-border divide-y divide-border">
          {items.length === 0 && (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No items yet — search above for the first thing the customer named.
            </p>
          )}
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <div className="font-medium">{item.fragranceName}</div>
                <div className="text-muted-foreground text-xs">
                  {item.brandName} · {item.sizeMl}ml · qty {item.quantity}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular">₹{rupee(item.unitPrice * item.quantity)}</span>
                <button
                  onClick={() => removeLineItem(item.key)}
                  aria-label={`Remove ${item.fragranceName}`}
                  title="Remove"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-lg border border-border bg-card p-4 space-y-3 h-fit">
        <h2 className="font-medium text-sm">Order summary</h2>
        <div className="text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular">₹{rupee(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Delivery</span>
            <span className="tabular">₹{items.length > 0 ? DELIVERY_FEE : 0}</span>
          </div>
          <div className="flex justify-between font-semibold text-base border-t border-border pt-1.5 mt-1.5">
            <span>Total</span>
            <span className="tabular">₹{rupee(total)}</span>
          </div>
        </div>
        <button
          onClick={saveOrder}
          disabled={items.length === 0 || saving}
          className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save order"}
        </button>
      </aside>
    </div>
  );
}

function SizePicker({
  result,
  onAdd,
  onCancel,
}: {
  result: FragranceSearchResult;
  onAdd: (variant: FragranceSearchResult["variants"][number], quantity: number) => void;
  onCancel: () => void;
}) {
  const [variantId, setVariantId] = useState(result.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const variant = result.variants.find((v) => v.id === variantId);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm">{result.fragrance_name}</div>
          <div className="text-xs text-muted-foreground">{result.brand_name}</div>
        </div>
        <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {result.variants
          .filter((v) => v.in_stock)
          .map((v) => (
            <button
              key={v.id}
              onClick={() => setVariantId(v.id)}
              className={`rounded-md border px-2.5 py-1.5 text-xs tabular ${
                v.id === variantId
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {v.size_ml}ml — ₹{rupee(v.price_inr)}
            </button>
          ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Qty</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm tabular"
        />
        <button
          onClick={() => variant && onAdd(variant, quantity)}
          disabled={!variant}
          className="ml-auto rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Add to order
        </button>
      </div>
    </div>
  );
}
