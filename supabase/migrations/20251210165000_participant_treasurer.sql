-- Per-trip treasurer flag so admin can assign 총무
alter table public.participants
  add column if not exists is_treasurer boolean not null default false;

comment on column public.participants.is_treasurer is 'Trip-level treasurer privilege';
