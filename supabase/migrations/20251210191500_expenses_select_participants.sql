-- Allow all trip participants to read expenses; insert/update/delete policies stay as-is (RLS elsewhere)
drop policy if exists "expenses_select_any" on public.expenses;

create policy "expenses_select_participants" on public.expenses
  for select using (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
    )
  );
