-- ========================================================
-- Supabase Schema for Elite Products
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ========================================================

-- 1. Create Products Table
create table if not exists public.products (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  price numeric(10, 2) not null,
  description text,
  category text,
  image_url text,
  features text[] default '{}',
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security (RLS)
alter table public.products enable row level security;

-- 3. Policy: Allow public read access (any visitor can view products)
create policy "Allow public read access"
  on public.products
  for select
  to anon, authenticated
  using (true);

-- 3b. Grant select permissions to anon and authenticated roles
grant select on table public.products to anon, authenticated;

-- 4. Seed Initial Products
insert into public.products (id, name, price, description, category, image_url, features)
values
  (
    '1',
    'Elite Pro Laptop 15"',
    1499.00,
    'Ultra-thin and lightweight laptop featuring the latest M-series processor, 16GB RAM, and a stunning 4K Retina display for professional workflows.',
    'Laptops',
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    array['15" 4K Retina Display', '16GB RAM', '512GB SSD', '18-Hour Battery Life']
  ),
  (
    '2',
    'Noise-Cancelling Headphones V2',
    349.00,
    'Premium over-ear wireless headphones with industry-leading active noise cancellation and spatial audio for an immersive listening experience.',
    'Audio',
    'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    array['Active Noise Cancellation', 'Spatial Audio', '40-Hour Battery', 'Bluetooth 5.3']
  ),
  (
    '3',
    'Smartwatch Series X',
    429.00,
    'Advanced smartwatch with health tracking, ECG app, always-on OLED display, and seamless integration with your mobile devices.',
    'Wearables',
    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    array['Always-On OLED', 'ECG & Blood Oxygen', 'Water Resistant 50m', 'GPS']
  ),
  (
    '4',
    '4K Action Camera',
    299.00,
    'Rugged, waterproof action camera capable of shooting stunning 4K video at 60fps with advanced image stabilization.',
    'Cameras',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    array['4K 60fps Video', 'Hyper-Stabilization', 'Waterproof to 10m', 'Voice Control']
  ),
  (
    '5',
    'Next-Gen Gaming Console',
    499.00,
    'Experience lightning-fast loading, ultra-high-speed SSD, and breathtaking 8K graphics with the newest iteration of home console gaming.',
    'Gaming',
    'https://images.unsplash.com/photo-1605901309584-818e25960b8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    array['8K Support', '1TB Custom SSD', 'Ray Tracing', '120fps Support']
  ),
  (
    '6',
    'Ultra-Wide Curved Monitor',
    799.00,
    '34-inch ultra-wide curved gaming monitor with 144Hz refresh rate, 1ms response time, and vibrant quantum dot colors.',
    'Monitors',
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    array['34" Curved WQHD', '144Hz Refresh Rate', '1ms Response Time', 'Quantum Dot']
  )
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  description = excluded.description,
  category = excluded.category,
  image_url = excluded.image_url,
  features = excluded.features;
