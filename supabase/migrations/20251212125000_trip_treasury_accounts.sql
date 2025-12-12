-- Trip-level treasury account for dues deposits
create table if not exists public.trip_treasury_accounts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid unique references public.trips(id) on delete cascade,
  treasurer_id uuid references public.participants(id) on delete set null,
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  memo text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.trip_treasury_accounts enable row level security;

-- Same-trip participants can read the treasury account (for paying dues)
create policy "trip_treasury_accounts_select_participants" on public.trip_treasury_accounts
  for select to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
    )
  );

-- Only treasurer of the trip can insert/update
create policy "trip_treasury_accounts_insert_treasurer" on public.trip_treasury_accounts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
        and p.is_treasurer = true
    )
  );

create policy "trip_treasury_accounts_update_treasurer" on public.trip_treasury_accounts
  for update to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
        and p.is_treasurer = true
    )
  )
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
        and p.is_treasurer = true
    )
  );

-- Keep updated_at fresh
create or replace function public.set_trip_treasury_accounts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_trip_treasury_accounts_updated_at on public.trip_treasury_accounts;
create trigger set_trip_treasury_accounts_updated_at
before update on public.trip_treasury_accounts
for each row execute function public.set_trip_treasury_accounts_updated_at();

