import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@saad/database";

// Server Component / Server Action client — reads the staff member's
// session from cookies so RLS policies (`auth.uid() in (select id from staff)`)
// correctly scope what they can see and write.
export function getServerSupabase() {
  const cookieStore = cookies();
  return createServerSupabaseClient({
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        );
      } catch {
        // Called from a Server Component render — safe to ignore since
        // middleware.ts already refreshes the session on each request.
      }
    },
  });
}
