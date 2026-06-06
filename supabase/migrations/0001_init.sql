-- =============================================================================
-- E-hailing Observability Engine — initial schema
-- PostgreSQL (Supabase). All tables are owner-scoped via Row Level Security.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- shifts
-- -----------------------------------------------------------------------------
create table if not exists public.shifts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  shift_start   timestamptz not null,
  shift_end     timestamptz,
  start_mileage numeric not null,
  end_mileage   numeric,
  -- {"platforms": {"Grab": 120.5}, "cash_vs_wallet": {"cash": 40, "wallet": 80}}
  earnings      jsonb not null default '{}'::jsonb,
  -- {"tolls": 5.20, "parking": 2.00}
  expenses      jsonb not null default '{}'::jsonb
);

create index if not exists shifts_user_start_idx
  on public.shifts (user_id, shift_start desc);

-- -----------------------------------------------------------------------------
-- fuel_logs
-- -----------------------------------------------------------------------------
create table if not exists public.fuel_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  date          timestamptz not null default now(),
  odometer      numeric not null,
  liters_pumped numeric not null,
  total_cost    numeric not null
);

create index if not exists fuel_logs_user_date_idx
  on public.fuel_logs (user_id, date desc);

-- -----------------------------------------------------------------------------
-- maintenance_logs
-- -----------------------------------------------------------------------------
create table if not exists public.maintenance_logs (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  date                 timestamptz not null default now(),
  part_name            text not null,
  replaced_at_odometer numeric not null,
  cost                 numeric not null
);

create index if not exists maintenance_logs_user_part_idx
  on public.maintenance_logs (user_id, part_name, replaced_at_odometer desc);

-- =============================================================================
-- Row Level Security: every row is private to its owner (auth.uid() = user_id)
-- =============================================================================
alter table public.shifts            enable row level security;
alter table public.fuel_logs         enable row level security;
alter table public.maintenance_logs  enable row level security;

-- shifts policies -------------------------------------------------------------
drop policy if exists "shifts_select_own" on public.shifts;
create policy "shifts_select_own" on public.shifts
  for select using (auth.uid() = user_id);

drop policy if exists "shifts_insert_own" on public.shifts;
create policy "shifts_insert_own" on public.shifts
  for insert with check (auth.uid() = user_id);

drop policy if exists "shifts_update_own" on public.shifts;
create policy "shifts_update_own" on public.shifts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "shifts_delete_own" on public.shifts;
create policy "shifts_delete_own" on public.shifts
  for delete using (auth.uid() = user_id);

-- fuel_logs policies ----------------------------------------------------------
drop policy if exists "fuel_select_own" on public.fuel_logs;
create policy "fuel_select_own" on public.fuel_logs
  for select using (auth.uid() = user_id);

drop policy if exists "fuel_insert_own" on public.fuel_logs;
create policy "fuel_insert_own" on public.fuel_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "fuel_update_own" on public.fuel_logs;
create policy "fuel_update_own" on public.fuel_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fuel_delete_own" on public.fuel_logs;
create policy "fuel_delete_own" on public.fuel_logs
  for delete using (auth.uid() = user_id);

-- maintenance_logs policies ---------------------------------------------------
drop policy if exists "maint_select_own" on public.maintenance_logs;
create policy "maint_select_own" on public.maintenance_logs
  for select using (auth.uid() = user_id);

drop policy if exists "maint_insert_own" on public.maintenance_logs;
create policy "maint_insert_own" on public.maintenance_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "maint_update_own" on public.maintenance_logs;
create policy "maint_update_own" on public.maintenance_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "maint_delete_own" on public.maintenance_logs;
create policy "maint_delete_own" on public.maintenance_logs
  for delete using (auth.uid() = user_id);
