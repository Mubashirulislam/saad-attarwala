-- Saad Attarwala — initial schema
-- Run via: supabase db push  (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- BRANDS  (Surrati, Ajmal, SMD Ayyub MD Yakub, Anfar, ...)
-- ---------------------------------------------------------------------------
create table brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  origin      text,               -- e.g. "Dubai, UAE"
  logo_url    text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FRAGRANCES  (an attar/perfume, always under exactly one brand)
-- ---------------------------------------------------------------------------
create table fragrances (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid not null references brands(id) on delete cascade,
  name        text not null,
  slug        text not null,
  created_at  timestamptz not null default now(),
  unique (brand_id, name)
);

create index fragrances_name_trgm_idx on fragrances using gin (name gin_trgm_ops);
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- VARIANTS  (a purchasable size of a fragrance — sizes are NOT fixed,
-- different brands offer different size ladders, so this is free-form)
-- ---------------------------------------------------------------------------
create table variants (
  id            uuid primary key default gen_random_uuid(),
  fragrance_id  uuid not null references fragrances(id) on delete cascade,
  size_ml       numeric not null check (size_ml > 0),
  price_inr     numeric not null check (price_inr >= 0),
  in_stock      boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (fragrance_id, size_ml)
);

-- ---------------------------------------------------------------------------
-- STAFF  (extends Supabase auth.users — Saad + future helpers)
-- ---------------------------------------------------------------------------
create table staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null default 'staff' check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ORDERS  (human-friendly order_number, e.g. SA-0001)
-- ---------------------------------------------------------------------------
create sequence order_number_seq start 1;

create table orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique
                       default ('SA-' || lpad(nextval('order_number_seq')::text, 4, '0')),
  customer_name      text,
  customer_phone     text,
  customer_address   text,
  status             text not null default 'draft'
                       check (status in ('draft', 'awaiting_payment', 'paid', 'shipped', 'delivered', 'cancelled')),
  delivery_fee_inr   numeric not null default 100,
  subtotal_inr       numeric not null default 0,
  total_inr          numeric not null default 0,
  courier            text default 'BlueDart',
  tracking_id        text,
  created_by         uuid references staff(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ORDER ITEMS  (snapshotted at time of order — price changes later must
-- never rewrite history / the screenshot Saad already sent the customer)
-- ---------------------------------------------------------------------------
create table order_items (
  id                          uuid primary key default gen_random_uuid(),
  order_id                    uuid not null references orders(id) on delete cascade,
  variant_id                  uuid references variants(id),
  brand_name_snapshot         text not null,
  fragrance_name_snapshot     text not null,
  size_ml_snapshot            numeric not null,
  unit_price_inr_snapshot     numeric not null,
  quantity                    integer not null default 1 check (quantity > 0),
  line_total_inr              numeric not null,
  created_at                  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Keep order totals in sync whenever line items change
-- ---------------------------------------------------------------------------
create or replace function recalc_order_totals() returns trigger as $$
begin
  update orders o
  set subtotal_inr = coalesce((
        select sum(line_total_inr) from order_items where order_id = coalesce(new.order_id, old.order_id)
      ), 0),
      total_inr = coalesce((
        select sum(line_total_inr) from order_items where order_id = coalesce(new.order_id, old.order_id)
      ), 0) + o.delivery_fee_inr,
      updated_at = now()
  where o.id = coalesce(new.order_id, old.order_id);
  return null;
end;
$$ language plpgsql;

create trigger order_items_recalc
after insert or update or delete on order_items
for each row execute function recalc_order_totals();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table brands enable row level security;
alter table fragrances enable row level security;
alter table variants enable row level security;
alter table staff enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Public catalog: anyone (anon) can read brands/fragrances/variants.
create policy "public can read brands" on brands for select using (true);
create policy "public can read fragrances" on fragrances for select using (true);
create policy "public can read variants" on variants for select using (true);

-- Only authenticated staff can write to the catalog.
create policy "staff can manage brands" on brands for all
  using (auth.uid() in (select id from staff)) with check (auth.uid() in (select id from staff));
create policy "staff can manage fragrances" on fragrances for all
  using (auth.uid() in (select id from staff)) with check (auth.uid() in (select id from staff));
create policy "staff can manage variants" on variants for all
  using (auth.uid() in (select id from staff)) with check (auth.uid() in (select id from staff));

-- Orders and customer data are staff-only, never exposed to anon.
create policy "staff can manage orders" on orders for all
  using (auth.uid() in (select id from staff)) with check (auth.uid() in (select id from staff));
create policy "staff can manage order_items" on order_items for all
  using (auth.uid() in (select id from staff)) with check (auth.uid() in (select id from staff));

-- Staff table: a staff member can read the roster; only an owner can add/edit staff.
create policy "staff can read roster" on staff for select
  using (auth.uid() in (select id from staff));
create policy "owner can manage staff" on staff for all
  using (auth.uid() in (select id from staff where role = 'owner'))
  with check (auth.uid() in (select id from staff where role = 'owner'));
