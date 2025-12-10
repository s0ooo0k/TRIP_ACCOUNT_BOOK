-- Allow all trip participants to 조회 dues, keep insert limited to treasurer
drop policy if exists "dues_select_treasurer" on public.dues;

create policy "dues_select_participants" on public.dues
  for select using (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
    )
  );
