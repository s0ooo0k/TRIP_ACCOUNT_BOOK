-- Profiles table to store user roles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user'
);

alter table public.profiles enable row level security;

-- Self read
create policy "profiles_select_self" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Self upsert (insert/update)
create policy "profiles_upsert_self" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admin helper: grant role update to existing admin users
create policy "profiles_admin_set_role" on public.profiles
  for update to authenticated
  using (exists (select 1 from public.profiles p2 where p2.id = auth.uid() and p2.role = 'admin'))
  with check (true);

-- Admin-only write policies for trips/participants (drop existing to avoid conflicts)
drop policy if exists "trips_all" on public.trips;
drop policy if exists "trips_select_any" on public.trips;

drop policy if exists "participants_select_visible" on public.participants;
drop policy if exists "participants_claim_self" on public.participants;
drop policy if exists "participants_admin_insert" on public.participants;
drop policy if exists "participants_admin_delete" on public.participants;

drop policy if exists "expenses_by_member" on public.expenses;
drop policy if exists "expenses_by_member_write" on public.expenses;
drop policy if exists "expense_participants_by_member" on public.expense_participants;

create policy "trips_select_any" on public.trips
  for select to authenticated
  using (true);

create policy "trips_admin_write" on public.trips
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Participants policies
drop policy if exists "participants_all" on public.participants;
drop policy if exists "participants_insert_member" on public.participants;
drop policy if exists "participants_delete_self" on public.participants;

create policy "participants_select_visible" on public.participants
  for select to authenticated
  using (true);

-- Claim/update only by owner or unclaimed
create policy "participants_claim_self" on public.participants
  for update to authenticated
  using (user_id is null or user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin-only insert/delete participants
create policy "participants_admin_insert" on public.participants
  for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "participants_admin_delete" on public.participants
  for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Expenses policies remain for members
drop policy if exists "expenses_all" on public.expenses;
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

-- Expense participants join table
drop policy if exists "expense_participants_all" on public.expense_participants;
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

-- Note: admin 사용자 지정은 대시보드 SQL 등으로 아래처럼 설정
-- update public.profiles set role='admin' where id='<auth.users.id>'; 
