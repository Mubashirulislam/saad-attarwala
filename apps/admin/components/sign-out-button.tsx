"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SignOutButton({ iconOnly }: { iconOnly?: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    await supabaseBrowser.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (iconOnly) {
    return (
      <button
        onClick={handleSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="hover:text-parchment"
      >
        <LogOut className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button onClick={handleSignOut} className="underline hover:text-parchment">
      Sign out
    </button>
  );
}
