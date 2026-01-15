-- Limit expense participant edits to treasurer or expense creator.

drop policy if exists "expense_participants_by_member" on public.expense_participants;
drop policy if exists "expense_participants_select_members" on public.expense_participants;
drop policy if exists "expense_participants_write_owner" on public.expense_participants;

create policy "expense_participants_select_members" on public.expense_participants
  for select to authenticated
  using (
    exists (
      select 1
      from public.participants p
      join public.expenses e on e.id = expense_participants.expense_id
      where p.user_id = auth.uid()
        and p.trip_id = e.trip_id
    )
  );

create policy "expense_participants_write_owner" on public.expense_participants
  for all to authenticated
  using (
    exists (
      select 1
      from public.participants p
      join public.expenses e on e.id = expense_participants.expense_id
      where p.user_id = auth.uid()
        and p.trip_id = e.trip_id
        and (p.is_treasurer = true or p.id = e.created_by)
    )
  )
  with check (
    exists (
      select 1
      from public.participants p
      join public.expenses e on e.id = expense_participants.expense_id
      where p.user_id = auth.uid()
        and p.trip_id = e.trip_id
        and (p.is_treasurer = true or p.id = e.created_by)
    )
  );
