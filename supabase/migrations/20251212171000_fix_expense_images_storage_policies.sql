-- Fix storage.objects policies for expense-images bucket
-- Previous version mistakenly referenced participants.name instead of storage.objects.name.

drop policy if exists "expense_images_objects_select" on storage.objects;
create policy "expense_images_objects_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'expense-images'
    and exists (
      select 1
      from public.participants p
      where p.user_id = auth.uid()
        and p.trip_id::text = split_part(storage.objects.name, '/', 1)
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
        and p.trip_id::text = split_part(storage.objects.name, '/', 1)
    )
  )
  with check (
    bucket_id = 'expense-images'
    and exists (
      select 1
      from public.participants p
      where p.user_id = auth.uid()
        and p.trip_id::text = split_part(storage.objects.name, '/', 1)
    )
  );

