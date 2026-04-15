-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- Or use Supabase CLI: supabase db push

create table if not exists public.transactions (
  id text primary key,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  date text not null,
  owner text not null,
  note text not null default '',
  created_at timestamptz not null
);

create table if not exists public.budget_config (
  id text primary key,
  monthly_limit numeric not null default 0,
  category_limits jsonb not null default '{}'::jsonb
);

insert into public.budget_config (id, monthly_limit, category_limits)
values ('default', 0, '{}'::jsonb)
on conflict (id) do nothing;

create table if not exists public.savings_goal (
  id text primary key,
  name text not null default '',
  target_amount numeric not null default 0,
  current_amount numeric not null default 0
);

insert into public.savings_goal (id, name, target_amount, current_amount)
values ('main', '', 0, 0)
on conflict (id) do nothing;

create table if not exists public.recurring_transactions (
  id text primary key,
  amount numeric not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  owner text not null,
  note text not null default '',
  day_of_month int not null check (day_of_month >= 1 and day_of_month <= 28),
  active boolean not null default true
);

alter table public.transactions enable row level security;
alter table public.budget_config enable row level security;
alter table public.savings_goal enable row level security;
alter table public.recurring_transactions enable row level security;

-- Anonymous access via anon key (suitable for a private app with URL + key only).
-- When you add Supabase Auth, replace these with user-scoped policies.
drop policy if exists "transactions_anon_all" on public.transactions;
drop policy if exists "budget_config_anon_all" on public.budget_config;
drop policy if exists "savings_goal_anon_all" on public.savings_goal;
drop policy if exists "recurring_anon_all" on public.recurring_transactions;

create policy "transactions_anon_all"
  on public.transactions for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "budget_config_anon_all"
  on public.budget_config for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "savings_goal_anon_all"
  on public.savings_goal for all
  to anon, authenticated
  using (true)
  with check (true);

create policy "recurring_anon_all"
  on public.recurring_transactions for all
  to anon, authenticated
  using (true)
  with check (true);
