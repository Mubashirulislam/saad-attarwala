-- Saad Attarwala — sales / time-boxed percentage discounts
-- Run via: supabase db push  (or paste into the Supabase SQL editor),
-- after 0001_init.sql and 0002_brand_logo_storage.sql

-- ---------------------------------------------------------------------------
-- SALES  (a named, dated percentage discount — e.g. "Independence Day Sale,
-- 15% off Surrati, Aug 13-15". brand_id null means it applies across every
-- brand instead of just one. Dates are plain `date`, not timestamptz — a
-- sale is meant as whole calendar days, not exact times.)
-- ---------------------------------------------------------------------------
create table sales (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  discount_percent  numeric not null check (discount_percent > 0 and discount_percent <= 100),
  brand_id          uuid references brands(id) on delete cascade,
  starts_at         date not null,
  ends_at           date not null,
  created_at        timestamptz not null default now(),
  check (ends_at >= starts_at)
);

create index sales_brand_id_idx on sales (brand_id);
create index sales_date_range_idx on sales (starts_at, ends_at);

alter table sales enable row level security;

-- Public catalog needs to read active sales to compute discounted prices,
-- same as the brands/fragrances/variants tables it already reads.
create policy "public can read sales" on sales for select using (true);

create policy "staff can manage sales" on sales for all
  using (auth.uid() in (select id from staff)) with check (auth.uid() in (select id from staff));
