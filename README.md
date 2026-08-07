# Saad Attarwala

Monorepo scaffold for two apps sharing one Supabase project:

- **apps/web** — the public price-list catalog → deploy to `saadswebsite.in`
- **apps/admin** — Saad's internal order + catalog tool → deploy to `admin.saadswebsite.in`
- **packages/database** — shared Supabase types + query helpers used by both apps
- **supabase/migrations/0001_init.sql** — full schema, RLS policies, order-number sequence, auto-recalculating order totals
- **supabase/migrations/0002_brand_logo_storage.sql** — public Storage bucket for brand logos, staff-only writes

Two separate Next.js apps (not one app with route groups) on purpose: the
admin app should never ship a single line of customer-order code to the
public bundle, and they deploy to two different domains with two different
security postures anyway.

## Brand direction

"Saad Attarwala" has no existing brand, so this scaffold sets a deliberately
restrained one rather than leaving it undesigned:

- **Type**: Geist Sans for everything UI, Geist Mono for every number —
  prices, sizes, order numbers, tracking IDs. This is the one consistent
  signature detail instead of a logomark.
- **Palette** (see `tailwind.config.ts` comments in both apps):
  - `ink` `#1B140F` — dark oud-brown, used for header/sidebar chrome only
  - `parchment` `#F4EEE3` — the actual light page background (a price table
    needs to be legible on a phone in daylight, so the page body stays light
    even though the brand skews dark)
  - `amber` `#B9812F` — resin accent, used sparingly (links, active states)
  - `glass` `#6B5744` — muted brown for secondary text
  - `sage` / `clay` — status colors for paid/success vs cancelled/error
- No icon or logomark yet — just a wordmark. Avoids the generic-AI-logo trap
  entirely; add one later if Saad wants it.

## Setup

1. Create a Supabase project, then run `supabase/migrations/0001_init.sql`
   and `supabase/migrations/0002_brand_logo_storage.sql`, in that order, in
   the SQL editor (or via `supabase db push` once the CLI is linked).
2. Create Saad's own `auth.users` account (Supabase dashboard → Authentication),
   then insert a matching row into `staff` with `role = 'owner'`.
3. Copy `.env.example` → `.env.local` in both `apps/web` and `apps/admin`,
   fill in the Supabase URL/anon key.
4. `pnpm install` at the repo root.
5. `pnpm dev:web` (port 3000) and `pnpm dev:admin` (port 3001) in separate terminals.

## What's intentionally left as TODOs for Claude Code

- **shadcn components aren't generated yet.** `components.json` is set up
  in both apps so `npx shadcn@latest add button input table select dialog
  badge` etc. will drop straight in. The hand-rolled `<input>`/`<table>`
  elements in this scaffold follow the same token system, so swapping them
  for generated shadcn components should be close to a 1:1 replace.
- **`getCatalog` / `searchFragrances`** in `packages/database/src/queries.ts`
  are written for clarity over efficiency (multiple round trips). Fine for
  Saad's catalog size, but worth collapsing into one nested query or a
  Postgres view once the shape is confirmed.
- **`app/api/revalidate/route.ts` has no auth check yet** — see the TODO
  inline; add the `REVALIDATE_SECRET` header check before deploying.
- **Trigram search** — the migration creates a `pg_trgm` index on
  `fragrances.name` but `searchFragrances` still uses a plain `ilike`.
  Swap to `similarity()` ordering once there's enough real data to tell
  the difference.
