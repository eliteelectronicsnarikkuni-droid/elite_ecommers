-- ========================================================
-- Supabase Storage & Admin Permissions Setup
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ltzihnyknfnaodgljnup/sql/new
-- ========================================================

-- 1. Grant write permissions on products table
grant all on table public.products to anon, authenticated;

-- 2. Add RLS Policies for insert, update, and delete on products
drop policy if exists "Allow insert access" on public.products;
create policy "Allow insert access"
  on public.products
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Allow update access" on public.products;
create policy "Allow update access"
  on public.products
  for update
  to anon, authenticated
  using (true);

drop policy if exists "Allow delete access" on public.products;
create policy "Allow delete access"
  on public.products
  for delete
  to anon, authenticated
  using (true);

-- 3. Create 'product-images' Storage Bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- 4. Storage Policies to allow uploading and reading product images
drop policy if exists "Allow public read of product images" on storage.objects;
create policy "Allow public read of product images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Allow public upload of product images" on storage.objects;
create policy "Allow public upload of product images"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Allow public update of product images" on storage.objects;
create policy "Allow public update of product images"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Allow public delete of product images" on storage.objects;
create policy "Allow public delete of product images"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id = 'product-images');
