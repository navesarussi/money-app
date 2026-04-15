-- הערות כלליות לפי חודש (מפתח בפורמט YYYY-MM)
create table if not exists public.month_notes (
  month_key text primary key,
  note text not null default ''
);

alter table public.month_notes enable row level security;

drop policy if exists "month_notes_anon_all" on public.month_notes;

create policy "month_notes_anon_all"
  on public.month_notes for all
  to anon, authenticated
  using (true)
  with check (true);
