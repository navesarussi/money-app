-- 005: Authentication, Households, Profiles, Invitations
-- Adds multi-tenant household support with Supabase Auth

-- 1. Households
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;

-- 2. Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'owner' check (role in ('owner', 'partner')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 3. Invitations
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now()
);

alter table public.invitations enable row level security;

-- 4. Add household_id to existing tables (nullable for backward compat)
alter table public.transactions
  add column if not exists household_id uuid references public.households(id);

alter table public.budget_config
  add column if not exists household_id uuid references public.households(id);

alter table public.savings_goal
  add column if not exists household_id uuid references public.households(id);

alter table public.recurring_transactions
  add column if not exists household_id uuid references public.households(id);

alter table public.month_notes
  add column if not exists household_id uuid references public.households(id);

alter table public.savings_accounts
  add column if not exists household_id uuid references public.households(id);

-- 5. Helper function: get current user's household_id
create or replace function public.get_my_household_id()
returns uuid
language sql
stable
security definer
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

-- 6. RLS Policies — households
create policy "households_select_own"
  on public.households for select
  to authenticated
  using (id = public.get_my_household_id());

create policy "households_insert"
  on public.households for insert
  to authenticated
  with check (true);

-- 7. RLS Policies — profiles
create policy "profiles_select_household"
  on public.profiles for select
  to authenticated
  using (household_id = public.get_my_household_id());

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- 8. RLS Policies — invitations
create policy "invitations_select_household"
  on public.invitations for select
  to authenticated
  using (household_id = public.get_my_household_id());

create policy "invitations_insert_household"
  on public.invitations for insert
  to authenticated
  with check (household_id = public.get_my_household_id());

create policy "invitations_update_household"
  on public.invitations for update
  to authenticated
  using (household_id = public.get_my_household_id());

-- 9. Replace old anon policies on existing tables with household-scoped policies

-- transactions
drop policy if exists "transactions_anon_all" on public.transactions;
create policy "transactions_household"
  on public.transactions for all
  to authenticated
  using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

-- budget_config
drop policy if exists "budget_config_anon_all" on public.budget_config;
create policy "budget_config_household"
  on public.budget_config for all
  to authenticated
  using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

-- savings_goal
drop policy if exists "savings_goal_anon_all" on public.savings_goal;
create policy "savings_goal_household"
  on public.savings_goal for all
  to authenticated
  using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

-- recurring_transactions
drop policy if exists "recurring_anon_all" on public.recurring_transactions;
create policy "recurring_household"
  on public.recurring_transactions for all
  to authenticated
  using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

-- month_notes (policy name may vary)
drop policy if exists "month_notes_anon_all" on public.month_notes;
create policy "month_notes_household"
  on public.month_notes for all
  to authenticated
  using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

-- savings_accounts
drop policy if exists "savings_accounts_anon_all" on public.savings_accounts;
create policy "savings_accounts_household"
  on public.savings_accounts for all
  to authenticated
  using (household_id = public.get_my_household_id())
  with check (household_id = public.get_my_household_id());

-- 10. Allow anon to read invitations by email (for signup flow)
create policy "invitations_anon_select_by_email"
  on public.invitations for select
  to anon
  using (status = 'pending');
