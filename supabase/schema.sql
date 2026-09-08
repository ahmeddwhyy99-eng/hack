create table if not exists public.verification_requests (
  id uuid primary key,
  user_id text not null check (user_id in ('user_1','user_2','user_3')),
  claim text not null check (claim in ('age_over_18','student_status','residency_status')),
  status text not null default 'pending' check (status in ('pending','verified','failed','rejected')),
  result boolean,
  reason_code text check (reason_code in ('CLAIM_NOT_SATISFIED','USER_REJECTED')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check ((status = 'pending' and result is null and reason_code is null and decided_at is null)
    or (status = 'rejected' and result is null and reason_code = 'USER_REJECTED' and decided_at is not null)
    or (status = 'verified' and result = true and reason_code is null and decided_at is not null)
    or (status = 'failed' and result = false and reason_code = 'CLAIM_NOT_SATISFIED' and decided_at is not null))
);
alter table public.verification_requests enable row level security;
revoke all on public.verification_requests from anon, authenticated;
