-- Allow admin role to read account tables across trips.

-- Participant accounts: admin can select all rows
drop policy if exists "participant_accounts_select_admin" on public.participant_accounts;
create policy "participant_accounts_select_admin" on public.participant_accounts
  for select to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  );

-- Trip treasury account: admin can select all rows
drop policy if exists "trip_treasury_accounts_select_admin" on public.trip_treasury_accounts;
create policy "trip_treasury_accounts_select_admin" on public.trip_treasury_accounts
  for select to authenticated
  using (
    exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
  );

