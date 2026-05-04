create extension if not exists pgcrypto;

create table if not exists public.scan_pricing_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  anon_id text,
  procedure text not null,
  with_contrast boolean not null default false,
  without_contrast boolean not null default false,
  insurance_company text not null,
  plan_name text not null,
  deductible text not null,
  oop_max text not null,
  healthcare_spend_this_year text not null,
  expects_high_healthcare_spend boolean not null default false,
  location text not null,
  urgency text not null check (urgency in ('asap', 'soon', 'flexible')),
  email text not null,
  anything_else text,
  summary text not null,
  status text not null default 'new',
  source text not null default 'scan_pricing',
  raw_payload jsonb not null default '{}'::jsonb
);

alter table public.scan_pricing_requests enable row level security;

drop policy if exists "scan_pricing_requests_insert_public" on public.scan_pricing_requests;
create policy "scan_pricing_requests_insert_public"
on public.scan_pricing_requests
for insert
to anon, authenticated
with check (true);
