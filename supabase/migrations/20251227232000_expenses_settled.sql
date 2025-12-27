-- Add settlement status columns to expenses
alter table public.expenses
  add column if not exists is_settled boolean not null default false,
  add column if not exists settled_at timestamptz,
  add column if not exists settled_by uuid references public.participants(id);

comment on column public.expenses.is_settled is '정산 완료 여부';
comment on column public.expenses.settled_at is '정산 완료 시각';
comment on column public.expenses.settled_by is '정산 완료 처리한 참여자 id';
