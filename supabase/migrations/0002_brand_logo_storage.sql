-- Saad Attarwala — brand logo storage
-- Run via: supabase db push  (or paste into the Supabase SQL editor), after 0001_init.sql

-- Public bucket: the web app renders logos as plain <img src> from the
-- public URL Supabase Storage returns, the same way anon can already read
-- brands/fragrances/variants (see 0001_init.sql). No signed URLs needed.
insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

create policy "public can read brand logos"
  on storage.objects for select
  using (bucket_id = 'brand-logos');

-- Only authenticated staff can upload/replace/delete a logo, same staff
-- check used for every other write in this project.
create policy "staff can manage brand logos"
  on storage.objects for all
  using (bucket_id = 'brand-logos' and auth.uid() in (select id from staff))
  with check (bucket_id = 'brand-logos' and auth.uid() in (select id from staff));
