import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

// Called by the admin app (server-side) right after a brand/fragrance/
// variant is created or edited, so saadswebsite.in reflects the change on
// next load instead of waiting up to 60s for the ISR window in app/page.tsx.
//
// TODO(claude-code): protect this with a shared secret header
// (REVALIDATE_SECRET env var checked against request headers) before
// deploying — right now it's open, which is fine for local scaffolding
// but not for production.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (process.env.REVALIDATE_SECRET && secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ revalidated: false }, { status: 401 });
  }

  revalidatePath("/");
  // Also invalidate every brand's own page — revalidatePath("/") only
  // covers the homepage, and /brand/[slug] is a sibling route, not nested
  // under it, so it was never getting the instant update, only its own 60s
  // ISR window.
  revalidatePath("/brand/[slug]", "page");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
