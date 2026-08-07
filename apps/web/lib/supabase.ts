import { createBrowserSupabaseClient } from "@saad/database";

// Public catalog only ever needs the anon browser client — RLS on the
// brands/fragrances/variants tables allows anon reads, everything else
// (orders, staff) is invisible to this key. See supabase/migrations/0001_init.sql.
export const supabase = createBrowserSupabaseClient();
