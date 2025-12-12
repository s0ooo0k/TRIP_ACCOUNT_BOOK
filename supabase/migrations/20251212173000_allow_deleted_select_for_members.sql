-- Allow all trip participants to view deleted records too.

-- Expenses: members can select regardless of is_deleted
drop policy if exists "expenses_select_visible" on public.expenses;
create policy "expenses_select_visible" on public.expenses
  for select to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = expenses.trip_id and p.user_id = auth.uid()
    )
  );

-- Dues: members can select regardless of is_deleted
drop policy if exists "dues_select_visible" on public.dues;
create policy "dues_select_visible" on public.dues
  for select to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = dues.trip_id and p.user_id = auth.uid()
    )
  );

-- Treasury transactions: members can select regardless of is_deleted
drop policy if exists "treasury_select_visible" on public.treasury_transactions;
create policy "treasury_select_visible" on public.treasury_transactions
  for select to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = treasury_transactions.trip_id and p.user_id = auth.uid()
    )
  );

