-- Fix month_notes: the table uses month_key as primary key but must be unique per household.
-- Migration 005 added household_id column (nullable) and a household-scoped RLS policy.
-- This migration:
--   1. Backfills any NULL household_id rows to a sentinel household (they are pre-auth legacy rows).
--   2. Makes household_id NOT NULL.
--   3. Drops the single-column primary key and creates a composite (month_key, household_id) primary key.
--   4. Updates the RLS policy to also allow the upsert USING check to pass.

-- Step 1: create a sentinel household for orphaned rows (no-op if table is already clean)
do $$
begin
  if exists (
    select 1 from public.month_notes where household_id is null limit 1
  ) then
    -- Insert a sentinel household to hold legacy rows
    insert into public.households (id, created_at)
    values ('00000000-0000-0000-0000-000000000000', now())
    on conflict (id) do nothing;

    update public.month_notes
    set household_id = '00000000-0000-0000-0000-000000000000'
    where household_id is null;
  end if;
end;
$$;

-- Step 2: make household_id NOT NULL
alter table public.month_notes
  alter column household_id set not null;

-- Step 3: replace primary key with composite key
alter table public.month_notes drop constraint if exists month_notes_pkey;
alter table public.month_notes add primary key (month_key, household_id);

-- Step 4: re-create RLS policy (already exists from 005, but ensure it is correct)
-- The existing "month_notes_household" policy from migration 005 covers this correctly.
-- No change needed to the policy itself.
