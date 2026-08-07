import { createClient } from "@supabase/supabase-js";
import { createBrowserClient, createServerClient, type CookieMethodsServer } from "@supabase/ssr";

// Both apps read these from their own .env.local — same Supabase project,
// different apps. The public/anon key is safe in the web app (RLS handles
// what anon can see). The admin app additionally requires an authenticated
// session for anything beyond the public catalog tables.

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Anon, cookie-less client for reading the public catalog from a Server
// Component (web app's homepage). No session needed — RLS already scopes
// anon access to brands/fragrances/variants only.
export function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// For use inside Next.js Server Components / Route Handlers, where cookies
// carry the staff member's auth session (admin app only).
export function createServerSupabaseClient(cookies: CookieMethodsServer) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );
}
