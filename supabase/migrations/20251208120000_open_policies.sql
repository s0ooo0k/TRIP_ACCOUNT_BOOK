-- Open RLS policies for club-only usage (anon key)
-- 각 테이블에 모든 작업을 허용합니다. 운영 환경에서는 조건부 정책으로 교체하세요.

create policy "trips_all" on public.trips
  for all using (true) with check (true);

create policy "participants_all" on public.participants
  for all using (true) with check (true);

create policy "expenses_all" on public.expenses
  for all using (true) with check (true);

create policy "expense_participants_all" on public.expense_participants
  for all using (true) with check (true);
