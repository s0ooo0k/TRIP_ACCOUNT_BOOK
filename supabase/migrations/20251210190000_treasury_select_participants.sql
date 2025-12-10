-- Allow all trip participants to read treasury transactions; inserts remain treasurer-only
drop policy if exists "treasury_select_treasurer" on public.treasury_transactions;

create policy "treasury_select_participants" on public.treasury_transactions
  for select using (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
    )
  );
