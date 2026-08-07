// Hand-written types matching supabase/migrations/0001_init.sql.
// Once Supabase CLI is set up, swap these for generated types via:
//   supabase gen types typescript --project-id <ref> > src/generated.ts

export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "shipped"
  | "delivered"
  | "cancelled";

export type StaffRole = "owner" | "staff";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  origin: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface Fragrance {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Variant {
  id: string;
  fragrance_id: string;
  size_ml: number;
  price_inr: number;
  in_stock: boolean;
  created_at: string;
}

// Denormalized shape the public catalog actually renders — one row per
// fragrance, with brand info flattened in and variants collected into
// an array so the table can pivot sizes into columns client-side.
export interface CatalogFragrance {
  fragrance_id: string;
  fragrance_name: string;
  brand_id: string;
  brand_name: string;
  brand_slug: string;
  brand_logo_url: string | null;
  variants: Pick<Variant, "size_ml" | "price_inr" | "in_stock">[];
}

export interface Staff {
  id: string;
  full_name: string;
  role: StaffRole;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  status: OrderStatus;
  delivery_fee_inr: number;
  subtotal_inr: number;
  total_inr: number;
  courier: string | null;
  tracking_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string | null;
  brand_name_snapshot: string;
  fragrance_name_snapshot: string;
  size_ml_snapshot: number;
  unit_price_inr_snapshot: number;
  quantity: number;
  line_total_inr: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

// Search result shape used by the admin "type an attar name" combobox —
// deliberately includes brand name since names collide across brands
// (e.g. "Ruh Khus No. 1" could exist under more than one brand).
export interface FragranceSearchResult {
  fragrance_id: string;
  fragrance_name: string;
  brand_name: string;
  variants: Pick<Variant, "id" | "size_ml" | "price_inr" | "in_stock">[];
}
