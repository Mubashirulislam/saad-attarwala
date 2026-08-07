import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { OrderDetail } from "@/components/order-detail";

export default async function OrderPage({ params }: { params: { id: string } }) {
  const supabase = getServerSupabase();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", params.id)
    .order("created_at", { ascending: true });

  return <OrderDetail order={order} items={items ?? []} />;
}
