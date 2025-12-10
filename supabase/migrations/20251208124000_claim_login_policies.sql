-- Anonymous login with per-participant claiming
-- 1) add user_id to participants to bind to auth.users
-- 2) replace open policies with scoped policies

-- Drop previous open policies if they exist
drop policy if exists "trips_all" on public.trips;
drop policy if exists "participants_all" on public.participants;
drop policy if exists "expenses_all" on public.expenses;
drop policy if exists "expense_participants_all" on public.expense_participants;

-- Column for binding a Supabase Auth user (anonymous or normal) to a participant row
alter table public.participants add column if not exists user_id uuid references auth.users(id);
create index if not exists participants_user_id_idx on public.participants(user_id);

-- Trips: anyone authenticated (including anonymous) can list/select trips
create policy "trips_select_any" on public.trips
  for select to authenticated
  using (true);

-- Participants
-- View participants in any trip (so 사용자가 목록에서 이름을 선택할 수 있음)
create policy "participants_select_visible" on public.participants
  for select to authenticated
  using (true);

-- Claim a participant row if it is free, or reuse if already claimed by this user
create policy "participants_claim_self" on public.participants
  for update to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id = auth.uid());

-- Insert new participant rows owned by the caller (optional, not used by UI yet)
create policy "participants_insert_member" on public.participants
  for insert to authenticated
  with check (user_id is null or user_id = auth.uid());

create policy "participants_delete_self" on public.participants
  for delete to authenticated
  using (user_id = auth.uid());

-- Expenses: only members of the trip (bound participant) may read/write
create policy "expenses_by_member" on public.expenses
  for select to authenticated
  using (exists (
    select 1 from public.participants p
    where p.trip_id = expenses.trip_id and p.user_id = auth.uid()
  ));

create policy "expenses_by_member_write" on public.expenses
  for all to authenticated
  using (exists (
    select 1 from public.participants p
    where p.trip_id = expenses.trip_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.participants p
    where p.trip_id = expenses.trip_id and p.user_id = auth.uid()
  ));

-- Expense participants join table: restrict to same trip membership
create policy "expense_participants_by_member" on public.expense_participants
  for all to authenticated
  using (exists (
    select 1 from public.participants p
    join public.expenses e on e.id = expense_participants.expense_id
    where p.user_id = auth.uid() and p.trip_id = e.trip_id
  ))
  with check (exists (
    select 1 from public.participants p
    join public.expenses e on e.id = expense_participants.expense_id
    where p.user_id = auth.uid() and p.trip_id = e.trip_id
  ));
