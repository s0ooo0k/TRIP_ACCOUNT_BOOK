-- Allow any trip participant to insert expenses; keep update/delete scoped to treasurer/admin.

drop policy if exists "expenses_insert_treasurer" on public.expenses;

create policy "expenses_insert_member" on public.expenses
  for insert to authenticated
  with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = expenses.trip_id and p.user_id = auth.uid()
    )
  );
