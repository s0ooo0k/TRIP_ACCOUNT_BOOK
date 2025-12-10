create table if not exists public.treasury_transactions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  treasurer_id uuid references public.participants(id) on delete set null,
  direction text not null check (direction in ('receive','send')),
  counterparty_id uuid references public.participants(id) on delete set null,
  amount integer not null check (amount > 0),
  memo text,
  created_at timestamptz default now()
);

alter table public.treasury_transactions enable row level security;

-- 총무(해당 trip에서 is_treasurer=true인 user)만 조회/추가 가능
create policy "treasury_select_treasurer" on public.treasury_transactions
  for select using (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
        and p.is_treasurer = true
    )
  );

create policy "treasury_insert_treasurer" on public.treasury_transactions
  for insert with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
        and p.is_treasurer = true
    )
  );
