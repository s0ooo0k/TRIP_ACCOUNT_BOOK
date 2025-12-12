-- Soft delete support for treasurers on expenses, dues, treasury_transactions.

-- 1) Add soft-delete columns
alter table public.expenses
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.participants(id);

alter table public.dues
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.participants(id);

alter table public.treasury_transactions
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.participants(id);

-- 2) Expenses RLS
drop policy if exists "expenses_by_member" on public.expenses;
drop policy if exists "expenses_by_member_write" on public.expenses;
drop policy if exists "expenses_select_participants" on public.expenses;

create policy "expenses_select_visible" on public.expenses
  for select to authenticated
  using (
    is_deleted = false
    and exists (
      select 1 from public.participants p
      where p.trip_id = expenses.trip_id and p.user_id = auth.uid()
    )
  );

create policy "expenses_select_treasurer_all" on public.expenses
  for select to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = expenses.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

create policy "expenses_select_admin" on public.expenses
  for select to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  );

drop policy if exists "expenses_insert_treasurer" on public.expenses;
create policy "expenses_insert_treasurer" on public.expenses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = expenses.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

drop policy if exists "expenses_update_treasurer" on public.expenses;
create policy "expenses_update_treasurer" on public.expenses
  for update to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = expenses.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  )
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = expenses.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

drop policy if exists "expenses_delete_admin" on public.expenses;
create policy "expenses_delete_admin" on public.expenses
  for delete to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  );

-- 3) Dues RLS
drop policy if exists "dues_select_participants" on public.dues;

create policy "dues_select_visible" on public.dues
  for select to authenticated
  using (
    is_deleted = false
    and exists (
      select 1 from public.participants p
      where p.trip_id = dues.trip_id and p.user_id = auth.uid()
    )
  );

create policy "dues_select_treasurer_all" on public.dues
  for select to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = dues.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

create policy "dues_select_admin" on public.dues
  for select to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  );

drop policy if exists "dues_insert_treasurer" on public.dues;
create policy "dues_insert_treasurer" on public.dues
  for insert to authenticated
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = dues.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

drop policy if exists "dues_update_treasurer" on public.dues;
create policy "dues_update_treasurer" on public.dues
  for update to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = dues.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  )
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = dues.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

drop policy if exists "dues_delete_admin" on public.dues;
create policy "dues_delete_admin" on public.dues
  for delete to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  );

-- 4) Treasury transactions RLS
drop policy if exists "treasury_select_participants" on public.treasury_transactions;

create policy "treasury_select_visible" on public.treasury_transactions
  for select to authenticated
  using (
    is_deleted = false
    and exists (
      select 1 from public.participants p
      where p.trip_id = treasury_transactions.trip_id and p.user_id = auth.uid()
    )
  );

create policy "treasury_select_treasurer_all" on public.treasury_transactions
  for select to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = treasury_transactions.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

create policy "treasury_select_admin" on public.treasury_transactions
  for select to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  );

-- keep insert treasurer-only
drop policy if exists "treasury_insert_treasurer" on public.treasury_transactions;
create policy "treasury_insert_treasurer" on public.treasury_transactions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = treasury_transactions.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

drop policy if exists "treasury_update_treasurer" on public.treasury_transactions;
create policy "treasury_update_treasurer" on public.treasury_transactions
  for update to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = treasury_transactions.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  )
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = treasury_transactions.trip_id and p.user_id = auth.uid() and p.is_treasurer = true
    )
  );

drop policy if exists "treasury_delete_admin" on public.treasury_transactions;
create policy "treasury_delete_admin" on public.treasury_transactions
  for delete to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  );

