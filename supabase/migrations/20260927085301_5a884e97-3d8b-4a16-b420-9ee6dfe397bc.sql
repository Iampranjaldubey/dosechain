alter table public.messages add column if not exists audio_url text;
alter table public.messages add column if not exists draft_reply jsonb;
alter table public.visits add column if not exists paid_at timestamptz;
alter table public.visits add column if not exists fee_inr int default 0;
create table public.payments (id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.visits on delete cascade, amount_inr int not null, method text default 'upi',
  ref text, created_at timestamptz default now());
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "staff full access" on public.payments for all to authenticated using (true) with check (true);
update public.visits set fee_inr = 950 where kind = 'vaccine';