-- Run once in the Supabase SQL editor with an administrative role.
-- Independent of the legacy verification_requests table.
create table if not exists public.auth_users (
  id uuid primary key,
  email text unique not null,
  password_hash text not null,
  active_membership boolean not null default false
);
create table if not exists public.auth_records (
  key text primary key,
  data jsonb not null,
  expires bigint not null
);
create index if not exists auth_records_expiry on public.auth_records(expires);
alter table public.auth_users enable row level security;
alter table public.auth_records enable row level security;
revoke all on public.auth_users, public.auth_records from anon, authenticated;
grant all on public.auth_users, public.auth_records to service_role;
-- DELETE RETURNING is atomic across concurrent requests and server instances.
create or replace function public.consume_auth_record(record_key text, current_time_ms bigint)
returns jsonb language sql security invoker set search_path = '' as $$
  with consumed as (
    delete from public.auth_records where key = record_key returning data, expires
  ) select data from consumed where expires > current_time_ms;
$$;
revoke all on function public.consume_auth_record(text, bigint) from public, anon, authenticated;
grant execute on function public.consume_auth_record(text, bigint) to service_role;
-- Optional scheduled cleanup (expired records are never accepted):
-- delete from public.auth_records where expires <= extract(epoch from now()) * 1000;
