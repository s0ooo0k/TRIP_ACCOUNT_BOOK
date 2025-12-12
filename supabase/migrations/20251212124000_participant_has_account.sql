-- Add non-sensitive account existence flag to participants
alter table public.participants
  add column if not exists has_account boolean not null default false;

comment on column public.participants.has_account is 'Whether participant has registered refund account info';

-- Backfill for existing accounts
update public.participants p
set has_account = true
where exists (
  select 1 from public.participant_accounts a
  where a.participant_id = p.id
);

