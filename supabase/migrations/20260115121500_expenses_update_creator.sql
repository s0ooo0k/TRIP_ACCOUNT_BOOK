-- Allow expense creators to update their own expenses; treasurer/admin policies remain.

drop policy if exists "expenses_update_creator" on public.expenses;

create policy "expenses_update_creator" on public.expenses
  for update to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.user_id = auth.uid()
        and p.id = expenses.created_by
        and p.trip_id = expenses.trip_id
    )
  )
  with check (
    exists (
      select 1 from public.participants p
      where p.user_id = auth.uid()
        and p.id = expenses.created_by
        and p.trip_id = expenses.trip_id
    )
  );
