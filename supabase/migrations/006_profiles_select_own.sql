-- Allow each user to read their own profile row.
-- The household-scoped policy alone can block the first read because get_my_household_id()
-- reads from profiles; selecting "own row" by id must always be allowed.

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());
