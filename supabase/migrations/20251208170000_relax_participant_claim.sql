-- Allow reclaiming a participant slot from any authenticated user
drop policy if exists "participants_claim_self" on public.participants;

create policy "participants_claim_self" on public.participants
  for update to authenticated
  using (true)
  with check (user_id = auth.uid());
