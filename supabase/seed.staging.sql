-- Pakeeza Perfumes — staging seed data
--
-- Run this ONLY against the staging Supabase project, after running
-- 0001_init.sql, 0002_brand_logo_storage.sql and 0003_sales.sql there.
-- Never run this against production — it exists so staging has realistic
-- fake data to click around in without touching real customer orders.
--
-- The brands/fragrances/variants/sale sections below are safe to re-run
-- (they use ON CONFLICT DO NOTHING against this schema's unique
-- constraints). The sample orders section at the bottom is NOT idempotent
-- — it creates new fake orders every time you run it — so either run it
-- once or delete/comment it out after the first run.

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
insert into brands (name, slug, origin) values
  ('Surrati', 'surrati', 'Jeddah, Saudi Arabia'),
  ('Ajmal', 'ajmal', 'Dubai, UAE'),
  ('Anfar', 'anfar', 'Dubai, UAE'),
  ('SMD Ayyub MD Yakub', 'smd-ayyub-md-yakub', 'Hyderabad, India')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Fragrances
-- ---------------------------------------------------------------------------
insert into fragrances (brand_id, name, slug)
select b.id, f.name, f.slug
from brands b
join (values
  ('Surrati',              'Oud Al Mubakhar',   'oud-al-mubakhar'),
  ('Surrati',              'Ruh Khus No. 1',    'ruh-khus-no-1'),
  ('Surrati',              'Musk Al Tahara',    'musk-al-tahara'),
  ('Ajmal',                'Mukhallat Abiyad',  'mukhallat-abiyad'),
  ('Ajmal',                'Dahn Al Oudh',      'dahn-al-oudh'),
  ('Ajmal',                'Wisal Dhahab',      'wisal-dhahab'),
  ('Anfar',                'Habibi',            'habibi'),
  ('Anfar',                'Sultan Al Arab',    'sultan-al-arab'),
  ('SMD Ayyub MD Yakub',   'Ruh Khus No. 1',    'ruh-khus-no-1'),
  ('SMD Ayyub MD Yakub',   'Kesar Chandan',     'kesar-chandan')
) as f(brand_name, name, slug) on f.brand_name = b.name
on conflict (brand_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- Variants (size ladder per fragrance — deliberately uneven across brands,
-- same as production, since sizes aren't fixed)
-- ---------------------------------------------------------------------------
insert into variants (fragrance_id, size_ml, price_inr, in_stock)
select f.id, v.size_ml, v.price_inr, v.in_stock
from fragrances f
join brands b on b.id = f.brand_id
join (values
  ('Surrati',            'Oud Al Mubakhar',  3::numeric,  350::numeric, true),
  ('Surrati',            'Oud Al Mubakhar',  6::numeric,  650::numeric, true),
  ('Surrati',            'Oud Al Mubakhar', 12::numeric, 1200::numeric, true),
  ('Surrati',            'Ruh Khus No. 1',   6::numeric,  450::numeric, true),
  ('Surrati',            'Ruh Khus No. 1',  12::numeric,  850::numeric, false),
  ('Surrati',            'Musk Al Tahara',   6::numeric,  400::numeric, true),
  ('Surrati',            'Musk Al Tahara',  12::numeric,  750::numeric, true),
  ('Ajmal',              'Mukhallat Abiyad', 6::numeric,  900::numeric, true),
  ('Ajmal',              'Mukhallat Abiyad', 12::numeric, 1700::numeric, true),
  ('Ajmal',              'Dahn Al Oudh',     3::numeric, 1500::numeric, true),
  ('Ajmal',              'Dahn Al Oudh',     6::numeric, 2800::numeric, false),
  ('Ajmal',              'Wisal Dhahab',     6::numeric,  600::numeric, true),
  ('Anfar',              'Habibi',           6::numeric,  350::numeric, true),
  ('Anfar',              'Habibi',          12::numeric,  650::numeric, true),
  ('Anfar',              'Sultan Al Arab',   6::numeric,  500::numeric, true),
  ('SMD Ayyub MD Yakub', 'Ruh Khus No. 1',   6::numeric,  380::numeric, true),
  ('SMD Ayyub MD Yakub', 'Kesar Chandan',    6::numeric,  420::numeric, true),
  ('SMD Ayyub MD Yakub', 'Kesar Chandan',   12::numeric,  800::numeric, true)
) as v(brand_name, fragrance_name, size_ml, price_inr, in_stock)
  on v.brand_name = b.name and v.fragrance_name = f.name
on conflict (fragrance_id, size_ml) do nothing;

-- ---------------------------------------------------------------------------
-- A currently-active sale, so the discount UI/pricing math has something to
-- show without waiting for a real date range. Wide window centered on
-- "today" so it stays active for a while regardless of when you seed this.
-- ---------------------------------------------------------------------------
insert into sales (name, discount_percent, brand_id, starts_at, ends_at)
select 'Staging Test Sale', 15, b.id, current_date - 5, current_date + 25
from brands b
where b.name = 'Surrati'
  and not exists (
    select 1 from sales s where s.name = 'Staging Test Sale' and s.brand_id = b.id
  );

-- ---------------------------------------------------------------------------
-- Staff — can't be seeded via plain SQL: create the auth user first.
--
--   1. Supabase dashboard (staging project) → Authentication → Add user
--      (e.g. staging-owner@example.com, any password).
--   2. Copy that user's UUID, then run:
--
--   insert into staff (id, full_name, role)
--   values ('<paste-uuid-here>', 'Staging Owner', 'owner');
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Sample orders — fake customers, one per status, so the orders list/detail
-- views have something in every state to review. NOT idempotent: re-running
-- this section creates more fake orders each time.
-- ---------------------------------------------------------------------------
with order_draft as (
  insert into orders (customer_name, customer_phone, customer_address, status, courier, tracking_id)
  values ('Fatima Sheikh', '+91 98765 43210', '12 MG Road, Pune, MH 411001', 'draft', 'BlueDart', null)
  returning id
)
insert into order_items (order_id, variant_id, brand_name_snapshot, fragrance_name_snapshot, size_ml_snapshot, unit_price_inr_snapshot, quantity, line_total_inr)
select order_draft.id, v.id, 'Surrati', 'Oud Al Mubakhar', v.size_ml, v.price_inr, 1, v.price_inr * 1
from order_draft, variants v
join fragrances f on f.id = v.fragrance_id
join brands b on b.id = f.brand_id
where b.name = 'Surrati' and f.name = 'Oud Al Mubakhar' and v.size_ml = 6;

with order_paid as (
  insert into orders (customer_name, customer_phone, customer_address, status, courier, tracking_id)
  values ('Imran Qureshi', '+91 91234 56789', '45 Park Street, Kolkata, WB 700016', 'paid', 'BlueDart', null)
  returning id
)
insert into order_items (order_id, variant_id, brand_name_snapshot, fragrance_name_snapshot, size_ml_snapshot, unit_price_inr_snapshot, quantity, line_total_inr)
select order_paid.id, v.id, 'Ajmal', 'Mukhallat Abiyad', v.size_ml, v.price_inr, 2, v.price_inr * 2
from order_paid, variants v
join fragrances f on f.id = v.fragrance_id
join brands b on b.id = f.brand_id
where b.name = 'Ajmal' and f.name = 'Mukhallat Abiyad' and v.size_ml = 6;

with order_shipped as (
  insert into orders (customer_name, customer_phone, customer_address, status, courier, tracking_id)
  values ('Ayesha Khan', '+91 99887 76655', '9 Residency Road, Bengaluru, KA 560025', 'shipped', 'BlueDart', 'BD778812345IN')
  returning id
)
insert into order_items (order_id, variant_id, brand_name_snapshot, fragrance_name_snapshot, size_ml_snapshot, unit_price_inr_snapshot, quantity, line_total_inr)
select order_shipped.id, v.id, 'Anfar', 'Habibi', v.size_ml, v.price_inr, 3, v.price_inr * 3
from order_shipped, variants v
join fragrances f on f.id = v.fragrance_id
join brands b on b.id = f.brand_id
where b.name = 'Anfar' and f.name = 'Habibi' and v.size_ml = 12;

with order_delivered as (
  insert into orders (customer_name, customer_phone, customer_address, status, courier, tracking_id)
  values ('Zainab Ali', '+91 90000 12345', '3 Church Road, Chennai, TN 600002', 'delivered', 'BlueDart', 'BD991122334IN')
  returning id
)
insert into order_items (order_id, variant_id, brand_name_snapshot, fragrance_name_snapshot, size_ml_snapshot, unit_price_inr_snapshot, quantity, line_total_inr)
select order_delivered.id, v.id, 'SMD Ayyub MD Yakub', 'Kesar Chandan', v.size_ml, v.price_inr, 1, v.price_inr * 1
from order_delivered, variants v
join fragrances f on f.id = v.fragrance_id
join brands b on b.id = f.brand_id
where b.name = 'SMD Ayyub MD Yakub' and f.name = 'Kesar Chandan' and v.size_ml = 12;

with order_cancelled as (
  insert into orders (customer_name, customer_phone, customer_address, status, courier, tracking_id)
  values ('Bilal Ahmed', '+91 98123 45670', '77 Lake Road, Hyderabad, TG 500001', 'cancelled', 'BlueDart', null)
  returning id
)
insert into order_items (order_id, variant_id, brand_name_snapshot, fragrance_name_snapshot, size_ml_snapshot, unit_price_inr_snapshot, quantity, line_total_inr)
select order_cancelled.id, v.id, 'Surrati', 'Musk Al Tahara', v.size_ml, v.price_inr, 1, v.price_inr * 1
from order_cancelled, variants v
join fragrances f on f.id = v.fragrance_id
join brands b on b.id = f.brand_id
where b.name = 'Surrati' and f.name = 'Musk Al Tahara' and v.size_ml = 6;
