-- Allow reading the display_name of users who have invited the current user (via pending invitations).
-- This is needed so the invitee can see who sent them an invitation in the Account tab.
-- The inviter is in a different household, so the household-scoped policy does not cover them.

create policy "profiles_select_invitation_inviter"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.invitations inv
      where inv.invited_by = profiles.id
        and lower(trim(inv.email)) = lower(trim(coalesce(auth.jwt() ->> 'email', '')))
        and inv.status = 'pending'
        and coalesce(auth.jwt() ->> 'email', '') <> ''
    )
  );
