import { createBrowserSupabaseClient } from "@saad/database";

// Client Component client — used by the login form and any client-side
// mutation (e.g. the order builder's live combobox search).
export const supabaseBrowser = createBrowserSupabaseClient();
