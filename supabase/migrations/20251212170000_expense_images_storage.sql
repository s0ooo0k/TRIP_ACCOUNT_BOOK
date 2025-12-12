-- Expense images (receipts) + Storage bucket + RLS policies

-- 1) Public table to link expenses to storage objects
create table if not exists public.expense_images (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  path text not null, -- storage.objects.name
  mime_type text,
  size integer,
  width integer,
  height integer,
  created_at timestamptz default now()
);

create index if not exists expense_images_expense_id_idx on public.expense_images(expense_id);

alter table public.expense_images enable row level security;

drop policy if exists "expense_images_by_member" on public.expense_images;
create policy "expense_images_by_member" on public.expense_images
  for all to authenticated
  using (
    exists (
      select 1
      from public.participants p
      join public.expenses e on e.id = expense_images.expense_id
      where p.user_id = auth.uid()
        and p.trip_id = e.trip_id
    )
  )
  with check (
    exists (
      select 1
      from public.participants p
      join public.expenses e on e.id = expense_images.expense_id
      where p.user_id = auth.uid()
        and p.trip_id = e.trip_id
    )
  );

-- 2) Storage bucket for expense receipts
insert into storage.buckets (id, name, public)
values ('expense-images', 'expense-images', false)
on conflict (id) do nothing;

-- 3) Storage objects policies scoped to this bucket.
-- Path convention: <trip_id>/<expense_id>/<uuid>.jpg
drop policy if exists "expense_images_objects_select" on storage.objects;
create policy "expense_images_objects_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'expense-images'
    and exists (
      select 1
      from public.participants p
      where p.user_id = auth.uid()
        and p.trip_id::text = split_part(name, '/', 1)
    )
  );

drop policy if exists "expense_images_objects_write" on storage.objects;
create policy "expense_images_objects_write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'expense-images'
    and exists (
      select 1
      from public.participants p
      where p.user_id = auth.uid()
        and p.trip_id::text = split_part(name, '/', 1)
    )
  )
  with check (
    bucket_id = 'expense-images'
    and exists (
      select 1
      from public.participants p
      where p.user_id = auth.uid()
        and p.trip_id::text = split_part(name, '/', 1)
    )
  );

