-- Link treasury transactions to expenses for settlement tracking
alter table public.treasury_transactions
  add column if not exists expense_id uuid references public.expenses(id) on delete set null;

comment on column public.treasury_transactions.expense_id is '연결된 지출 내역 (정산 완료용)';
