-- Audit logs for updates/deletes across core records

create table if not exists public.change_logs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.participants(id) on delete set null,
  before jsonb,
  after jsonb
);

create index if not exists change_logs_trip_id_idx on public.change_logs(trip_id);
create index if not exists change_logs_entity_idx on public.change_logs(entity_type, entity_id);
create index if not exists change_logs_changed_at_idx on public.change_logs(changed_at desc);

alter table public.change_logs enable row level security;

-- Same-trip participants can read change logs
drop policy if exists "change_logs_select_participants" on public.change_logs;
create policy "change_logs_select_participants" on public.change_logs
  for select
  using (
    exists (
      select 1 from public.participants p
      where p.trip_id = change_logs.trip_id
        and p.user_id = auth.uid()
    )
  );

-- Trigger helper to log updates/deletes/restores
create or replace function public.log_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_actor uuid;
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_participant_ids uuid[];
begin
  v_trip_id := coalesce(new.trip_id, old.trip_id);
  if v_trip_id is null then
    return null;
  end if;

  select p.id
    into v_actor
    from public.participants p
   where p.trip_id = v_trip_id
     and p.user_id = auth.uid()
   limit 1;

  v_before := to_jsonb(old);
  v_after := to_jsonb(new);

  if tg_table_name = 'expenses' then
    select array_agg(participant_id order by participant_id)
      into v_participant_ids
      from public.expense_participants
     where expense_id = old.id;
    v_before := jsonb_set(v_before, '{participant_ids}', to_jsonb(coalesce(v_participant_ids, array[]::uuid[])), true);

    select array_agg(participant_id order by participant_id)
      into v_participant_ids
      from public.expense_participants
     where expense_id = new.id;
    v_after := jsonb_set(v_after, '{participant_ids}', to_jsonb(coalesce(v_participant_ids, array[]::uuid[])), true);
  end if;

  if (old.is_deleted is distinct from new.is_deleted) then
    v_action := case when new.is_deleted then 'delete' else 'restore' end;
  else
    v_action := 'update';
  end if;

  insert into public.change_logs(
    trip_id,
    entity_type,
    entity_id,
    action,
    changed_by,
    before,
    after
  ) values (
    v_trip_id,
    tg_table_name,
    new.id,
    v_action,
    v_actor,
    v_before,
    v_after
  );

  return null;
end;
$$;

-- Log updates on core tables

drop trigger if exists expenses_change_log on public.expenses;
create trigger expenses_change_log
  after update on public.expenses
  for each row execute function public.log_change();


drop trigger if exists dues_change_log on public.dues;
create trigger dues_change_log
  after update on public.dues
  for each row execute function public.log_change();


drop trigger if exists treasury_change_log on public.treasury_transactions;
create trigger treasury_change_log
  after update on public.treasury_transactions
  for each row execute function public.log_change();

-- Log participant list changes for expenses
create or replace function public.log_expense_participants_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_actor uuid;
  v_expense_id uuid;
  v_after uuid[];
  v_before uuid[];
begin
  for v_expense_id in
    select distinct expense_id from new_rows
  loop
    select trip_id into v_trip_id from public.expenses where id = v_expense_id;
    if v_trip_id is null then
      continue;
    end if;

    select p.id
      into v_actor
      from public.participants p
     where p.trip_id = v_trip_id
       and p.user_id = auth.uid()
     limit 1;

    select array_agg(participant_id order by participant_id)
      into v_after
      from public.expense_participants
     where expense_id = v_expense_id;

    select array_agg(distinct participant_id order by participant_id)
      into v_before
      from (
        select participant_id from public.expense_participants where expense_id = v_expense_id
        except
        select participant_id from new_rows where expense_id = v_expense_id
      ) s;

    insert into public.change_logs(
      trip_id,
      entity_type,
      entity_id,
      action,
      changed_by,
      before,
      after
    ) values (
      v_trip_id,
      'expenses',
      v_expense_id,
      'participants_update',
      v_actor,
      jsonb_build_object('participant_ids', coalesce(v_before, array[]::uuid[])),
      jsonb_build_object('participant_ids', coalesce(v_after, array[]::uuid[]))
    );
  end loop;

  return null;
end;
$$;


create or replace function public.log_expense_participants_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_actor uuid;
  v_expense_id uuid;
  v_after uuid[];
  v_before uuid[];
begin
  for v_expense_id in
    select distinct expense_id from old_rows
  loop
    select trip_id into v_trip_id from public.expenses where id = v_expense_id;
    if v_trip_id is null then
      continue;
    end if;

    select p.id
      into v_actor
      from public.participants p
     where p.trip_id = v_trip_id
       and p.user_id = auth.uid()
     limit 1;

    select array_agg(participant_id order by participant_id)
      into v_after
      from public.expense_participants
     where expense_id = v_expense_id;

    select array_agg(distinct participant_id order by participant_id)
      into v_before
      from (
        select participant_id from public.expense_participants where expense_id = v_expense_id
        union
        select participant_id from old_rows where expense_id = v_expense_id
      ) s;

    insert into public.change_logs(
      trip_id,
      entity_type,
      entity_id,
      action,
      changed_by,
      before,
      after
    ) values (
      v_trip_id,
      'expenses',
      v_expense_id,
      'participants_update',
      v_actor,
      jsonb_build_object('participant_ids', coalesce(v_before, array[]::uuid[])),
      jsonb_build_object('participant_ids', coalesce(v_after, array[]::uuid[]))
    );
  end loop;

  return null;
end;
$$;


drop trigger if exists expense_participants_change_log on public.expense_participants;
drop trigger if exists expense_participants_insert_log on public.expense_participants;
drop trigger if exists expense_participants_delete_log on public.expense_participants;

create trigger expense_participants_insert_log
  after insert on public.expense_participants
  referencing new table as new_rows
  for each statement execute function public.log_expense_participants_insert();

create trigger expense_participants_delete_log
  after delete on public.expense_participants
  referencing old table as old_rows
  for each statement execute function public.log_expense_participants_delete();
