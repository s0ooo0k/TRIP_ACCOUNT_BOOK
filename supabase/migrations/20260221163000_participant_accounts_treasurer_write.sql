-- Allow same-trip treasurer to register and update participant accounts.

drop policy if exists "participant_accounts_insert_self" on public.participant_accounts;
create policy "participant_accounts_insert_self" on public.participant_accounts
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.participants owner
      join public.participants actor on actor.trip_id = owner.trip_id
      where owner.id = participant_accounts.participant_id
        and actor.user_id = auth.uid()
        and (
          actor.id = owner.id
          or actor.is_treasurer = true
        )
    )
  );

drop policy if exists "participant_accounts_update_self" on public.participant_accounts;
create policy "participant_accounts_update_self" on public.participant_accounts
  for update to authenticated
  using (
    exists (
      select 1
      from public.participants owner
      join public.participants actor on actor.trip_id = owner.trip_id
      where owner.id = participant_accounts.participant_id
        and actor.user_id = auth.uid()
        and (
          actor.id = owner.id
          or actor.is_treasurer = true
        )
    )
  )
  with check (
    exists (
      select 1
      from public.participants owner
      join public.participants actor on actor.trip_id = owner.trip_id
      where owner.id = participant_accounts.participant_id
        and actor.user_id = auth.uid()
        and (
          actor.id = owner.id
          or actor.is_treasurer = true
        )
    )
  );
