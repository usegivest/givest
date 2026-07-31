-- Givest initial schema.
-- Profiles are keyed to auth.users; drops mirrors gifts sent from the app.
-- The app works fully without Supabase - this schema is optional sync.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  wallet_address text unique,
  x_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  claim_key text not null,
  sender_address text not null,
  symbol text not null,
  token_address text not null,
  usd_value numeric(18, 2) not null default 0,
  splits integer not null default 1,
  claimable_at timestamptz,
  status text not null default 'active',
  tx_hash text,
  created_at timestamptz not null default now(),
  unique (owner_id, claim_key)
);

create index if not exists drops_owner_created_idx
  on public.drops (owner_id, created_at desc);

-- Row Level Security: owner-only access on everything.
alter table public.profiles enable row level security;
alter table public.drops enable row level security;

create policy "profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid () = id);

create policy "profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid () = id);

create policy "profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid () = id)
  with check (auth.uid () = id);

create policy "drops are viewable by owner"
  on public.drops for select
  using (auth.uid () = owner_id);

create policy "drops are insertable by owner"
  on public.drops for insert
  with check (auth.uid () = owner_id);

create policy "drops are updatable by owner"
  on public.drops for update
  using (auth.uid () = owner_id)
  with check (auth.uid () = owner_id);

create policy "drops are deletable by owner"
  on public.drops for delete
  using (auth.uid () = owner_id);
