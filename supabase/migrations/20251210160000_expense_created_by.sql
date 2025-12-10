-- Add created_by to expenses to track who 등록했는지
alter table public.expenses
  add column if not exists created_by uuid;

alter table public.expenses
  add constraint expenses_created_by_fkey
  foreign key (created_by) references public.participants(id) on delete set null;

comment on column public.expenses.created_by is '참여자 id (participants.id) who added this expense';
