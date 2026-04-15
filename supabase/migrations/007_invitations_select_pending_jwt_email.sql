-- Pending invitations must be readable by the invited email before a profiles row exists.
-- invitations_select_household only works when get_my_household_id() is set; new signups have no profile yet.
-- invitations_anon_select_by_email applies only to the anon role, but after signUp the client often has a session (authenticated).

create policy "invitations_select_pending_jwt_email"
  on public.invitations for select
  to authenticated
  using (
    status = 'pending'
    and lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
    and coalesce(auth.jwt() ->> 'email', '') <> ''
  );
