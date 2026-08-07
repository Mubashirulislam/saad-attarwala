"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Order, OrderItem } from "@saad/database";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

const rupee = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

export function OrderDetail({ order: initialOrder, items }: { order: Order; items: OrderItem[] }) {
  const router = useRouter();
  const showToast = useToast();
  const [order, setOrder] = useState(initialOrder);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function updateStatus(patch: Partial<Pick<Order, "status" | "courier" | "tracking_id">>) {
    setUpdatingStatus(true);
    const { data, error } = await supabaseBrowser
      .from("orders")
      .update(patch)
      .eq("id", order.id)
      .select()
      .single();
    setUpdatingStatus(false);
    setConfirmingCancel(false);
    if (error) return showToast(error.message, "error");
    setOrder(data);
  }

  async function deleteOrder() {
    setDeleting(true);
    // order_items cascade-deletes with the order (see
    // supabase/migrations/0001_init.sql), so this removes the whole order
    // in one call.
    const { error } = await supabaseBrowser.from("orders").delete().eq("id", order.id);
    if (error) {
      setDeleting(false);
      setConfirmingDelete(false);
      return showToast(error.message, "error");
    }
    router.push("/orders");
    router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/orders" className="text-xs text-muted-foreground hover:text-foreground">
          ← All orders
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-xl font-semibold tabular">{order.order_number}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Placed {new Date(order.created_at).toLocaleString("en-IN")}
        </p>
      </div>

      {/* Screenshot-ready summary — this is what Saad sends the customer,
          so it stays free of admin-only controls. */}
      <div className="rounded-lg border border-border bg-card p-6 pb-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Saad Attarwala</span>
          <span className="tabular text-sm text-muted-foreground">{order.order_number}</span>
        </div>

        <div className="mt-6 divide-y divide-border">
          {items.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No items on this order.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3.5 text-sm">
              <div>
                <div className="font-medium">{item.fragrance_name_snapshot}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {item.brand_name_snapshot} · {item.size_ml_snapshot}ml · qty {item.quantity}
                </div>
              </div>
              <span className="tabular">₹{rupee(item.line_total_inr)}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular">₹{rupee(order.subtotal_inr)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery</span>
            <span className="tabular">₹{rupee(order.delivery_fee_inr)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="tabular">₹{rupee(order.total_inr)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CustomerDetailsForm order={order} onSaved={setOrder} />
        <StatusActions
          order={order}
          updating={updatingStatus}
          onUpdate={updateStatus}
          onRequestCancel={() => setConfirmingCancel(true)}
          onRequestDelete={() => setConfirmingDelete(true)}
        />
      </div>

      <ConfirmDialog
        open={confirmingCancel}
        title={`Cancel order ${order.order_number}?`}
        description="This marks the order as cancelled. It stays in the list, just flagged as cancelled."
        confirmLabel="Cancel order"
        destructive
        loading={updatingStatus}
        onConfirm={() => updateStatus({ status: "cancelled" })}
        onCancel={() => setConfirmingCancel(false)}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete order ${order.order_number}?`}
        description="This permanently deletes the order and its items — unlike cancelling, there's no record left afterward. This can't be undone."
        confirmLabel="Delete order"
        destructive
        loading={deleting}
        onConfirm={deleteOrder}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

function CustomerDetailsForm({
  order,
  onSaved,
}: {
  order: Order;
  onSaved: (o: Order) => void;
}) {
  const showToast = useToast();
  const [name, setName] = useState(order.customer_name ?? "");
  const [phone, setPhone] = useState(order.customer_phone ?? "");
  const [address, setAddress] = useState(order.customer_address ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { data, error } = await supabaseBrowser
      .from("orders")
      .update({
        customer_name: name.trim() || null,
        customer_phone: phone.trim() || null,
        customer_address: address.trim() || null,
      })
      .eq("id", order.id)
      .select()
      .single();
    setSaving(false);
    if (error) return showToast(error.message, "error");
    onSaved(data);
    showToast("Customer details saved.");
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h2 className="text-sm font-medium">Customer</h2>
      <div className="space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Delivery address"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save customer details"}
      </button>
    </div>
  );
}

function StatusActions({
  order,
  updating,
  onUpdate,
  onRequestCancel,
  onRequestDelete,
}: {
  order: Order;
  updating: boolean;
  onUpdate: (patch: Partial<Pick<Order, "status" | "courier" | "tracking_id">>) => void;
  onRequestCancel: () => void;
  onRequestDelete: () => void;
}) {
  const [courier, setCourier] = useState(order.courier ?? "BlueDart");
  const [trackingId, setTrackingId] = useState(order.tracking_id ?? "");

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h2 className="text-sm font-medium">Status</h2>

      {(order.status === "draft" || order.status === "awaiting_payment") && (
        <button
          onClick={() => onUpdate({ status: "paid" })}
          disabled={updating}
          className="w-full rounded-md bg-success text-success-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          Mark as paid
        </button>
      )}

      {order.status === "paid" && (
        <div className="space-y-2">
          <input
            value={courier}
            onChange={(e) => setCourier(e.target.value)}
            placeholder="Courier"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <input
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Tracking ID"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            onClick={() =>
              onUpdate({
                status: "shipped",
                courier: courier.trim() || null,
                tracking_id: trackingId.trim() || null,
              })
            }
            disabled={updating}
            className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Mark as shipped
          </button>
        </div>
      )}

      {order.status === "shipped" && (
        <>
          {order.tracking_id && (
            <p className="text-xs text-muted-foreground">
              {order.courier} · <span className="tabular">{order.tracking_id}</span>
            </p>
          )}
          <button
            onClick={() => onUpdate({ status: "delivered" })}
            disabled={updating}
            className="w-full rounded-md bg-success text-success-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            Mark as delivered
          </button>
        </>
      )}

      {order.status === "delivered" && (
        <p className="text-sm text-muted-foreground">This order has been delivered.</p>
      )}

      {order.status === "cancelled" && (
        <p className="text-sm text-muted-foreground">This order was cancelled.</p>
      )}

      {order.status !== "cancelled" && order.status !== "delivered" && (
        <button
          onClick={onRequestCancel}
          disabled={updating}
          className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50"
        >
          Cancel order
        </button>
      )}

      {/* Set apart and colored persistently (not just on :hover, which
          doesn't exist on touch) since this is the one irreversible action
          here — cancelling keeps the order as a record, this doesn't. */}
      <div className="border-t border-border pt-3">
        <button
          onClick={onRequestDelete}
          disabled={updating}
          className="w-full text-xs font-medium text-destructive hover:underline disabled:opacity-50"
        >
          Delete order permanently
        </button>
      </div>
    </div>
  );
}
