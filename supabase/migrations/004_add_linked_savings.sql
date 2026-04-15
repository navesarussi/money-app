-- Add linked_savings_id to transactions
alter table public.transactions 
add column if not exists linked_savings_id text;

-- Optional: Add foreign key (only if you want strict referential integrity)
-- alter table public.transactions 
-- add constraint fk_linked_savings 
-- foreign key (linked_savings_id) references public.savings_accounts(id) 
-- on delete set null;
