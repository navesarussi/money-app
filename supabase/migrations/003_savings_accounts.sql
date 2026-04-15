-- Savings accounts / loans / pensions
create table if not exists savings_accounts (
  id          text primary key,
  type        text not null check (type in ('emergency','goal','investment','pension','loan')),
  name        text not null default '',
  target_amount  numeric not null default 0,
  current_amount numeric not null default 0,
  monthly_amount numeric not null default 0,
  interest_rate  numeric not null default 0,
  note        text not null default '',
  created_at  timestamptz not null default now()
);

alter table savings_accounts enable row level security;

create policy savings_accounts_anon_all on savings_accounts
  for all using (true) with check (true);
