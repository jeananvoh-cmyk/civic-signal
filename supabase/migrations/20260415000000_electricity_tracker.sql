-- ═══════════════════════════════════════════════════════════════════
-- MODULE SUIVI ÉLECTRICITÉ PRÉPAYÉE — SIGNA-CI
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Compteurs / installations ───────────────────────────────────
create table if not exists public.electricity_meters (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null default 'Mon compteur',   -- "Maison", "Bureau"…
  meter_number text,                                  -- N° physique du compteur
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── 2. Recharges ───────────────────────────────────────────────────
create table if not exists public.electricity_recharges (
  id            uuid primary key default gen_random_uuid(),
  meter_id      uuid not null references public.electricity_meters(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  recharged_at  timestamptz not null default now(),  -- date/heure de la recharge
  kwh_purchased numeric(10,2) not null,              -- kWh achetés
  amount_fcfa   numeric(10,0),                       -- montant total payé en FCFA
  energy_fcfa   numeric(10,0),                       -- part énergie
  taxes_fcfa    numeric(10,0),                       -- taxes/frais
  token_code    text,                                -- code à entrer sur le compteur
  reference     text,                                -- référence transaction
  raw_sms       text,                                -- SMS brut (si importé)
  source        text not null default 'manual'       -- 'sms' | 'manual' | 'receipt'
                  check (source in ('sms','manual','receipt')),
  created_at    timestamptz not null default now()
);

-- ── 3. Lectures / mises à jour de consommation ─────────────────────
-- L'utilisateur indique ses kWh restants tous les 2j ou chaque semaine
create table if not exists public.electricity_readings (
  id             uuid primary key default gen_random_uuid(),
  meter_id       uuid not null references public.electricity_meters(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  read_at        timestamptz not null default now(),  -- moment de la lecture
  kwh_remaining  numeric(10,2) not null,              -- kWh restants observés
  note           text,
  created_at     timestamptz not null default now()
);

-- ── Index ──────────────────────────────────────────────────────────
create index if not exists idx_elec_meters_user      on public.electricity_meters(user_id);
create index if not exists idx_elec_recharges_meter  on public.electricity_recharges(meter_id, recharged_at desc);
create index if not exists idx_elec_readings_meter   on public.electricity_readings(meter_id, read_at desc);

-- ── RLS ────────────────────────────────────────────────────────────
alter table public.electricity_meters   enable row level security;
alter table public.electricity_recharges enable row level security;
alter table public.electricity_readings  enable row level security;

-- Chaque utilisateur ne voit et ne modifie que ses propres données
create policy "own meters"     on public.electricity_meters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own recharges"  on public.electricity_recharges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own readings"   on public.electricity_readings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
