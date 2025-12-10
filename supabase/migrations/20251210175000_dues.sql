-- 회비 목표 테이블
create table if not exists public.dues (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  title text not null,
  due_date date,
  target_amount integer not null check (target_amount > 0),
  created_at timestamptz default now()
);

alter table public.dues enable row level security;

-- 총무만 조회/작성
create policy "dues_select_treasurer" on public.dues
  for select using (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
        and p.is_treasurer = true
    )
  );

create policy "dues_insert_treasurer" on public.dues
  for insert with check (
    exists (
      select 1 from public.participants p
      where p.trip_id = trip_id
        and p.user_id = auth.uid()
        and p.is_treasurer = true
    )
  );

-- treasury_transactions에 회비 항목 연결
alter table public.treasury_transactions
  add column if not exists due_id uuid references public.dues(id) on delete set null;
