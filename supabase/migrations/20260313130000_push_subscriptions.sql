-- Push subscriptions table for Web Push API
-- Stores browser push subscription data per user+device

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  commune     text not null default '',
  quartier    text,
  created_at  timestamptz not null default now(),
  -- Each user can have multiple devices but not duplicate endpoints
  unique(user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Users can manage their own subscriptions
create policy "Users manage own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role (Edge Functions) can read all subscriptions to send pushes
-- (already bypasses RLS via service_role key)

-- Index for fast lookup by commune
create index if not exists idx_push_subscriptions_commune
  on public.push_subscriptions(commune);
