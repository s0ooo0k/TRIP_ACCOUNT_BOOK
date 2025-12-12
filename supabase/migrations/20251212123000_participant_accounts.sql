-- Participant account info for refunds
create table if not exists public.participant_accounts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid unique references public.participants(id) on delete cascade,
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  is_public boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.participant_accounts enable row level security;

-- Allow reading:
-- 1) same-trip treasurer, or
-- 2) owner themselves, or
-- 3) same-trip participants if is_public=true
create policy "participant_accounts_select_trip_scoped" on public.participant_accounts
  for select to authenticated
  using (
    exists (
      select 1
      from public.participants owner
      join public.participants viewer on viewer.trip_id = owner.trip_id
      where owner.id = participant_id
        and viewer.user_id = auth.uid()
        and (
          is_public = true
          or viewer.id = owner.id
          or viewer.is_treasurer = true
        )
    )
  );

-- Only owner can insert/update their own account
create policy "participant_accounts_insert_self" on public.participant_accounts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.participants owner
      where owner.id = participant_id
        and owner.user_id = auth.uid()
    )
  );

create policy "participant_accounts_update_self" on public.participant_accounts
  for update to authenticated
  using (
    exists (
      select 1 from public.participants owner
      where owner.id = participant_id
        and owner.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.participants owner
      where owner.id = participant_id
        and owner.user_id = auth.uid()
    )
  );

-- Keep updated_at fresh
create or replace function public.set_participant_accounts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_participant_accounts_updated_at on public.participant_accounts;
create trigger set_participant_accounts_updated_at
before update on public.participant_accounts
for each row execute function public.set_participant_accounts_updated_at();

