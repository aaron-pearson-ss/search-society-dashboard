create table public.client_insights (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  fingerprint text not null,
  insight_type text not null,
  severity text not null check (severity in ('critical','warning','opportunity','info')),
  title text not null,
  summary text not null,
  recommendation text,
  metric_name text,
  current_value numeric,
  previous_value numeric,
  change_percent numeric,
  status text not null default 'new' check (status in ('new','reviewed','dismissed')),
  generated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (client_id, fingerprint)
);
alter table public.client_insights enable row level security;
create policy "members can manage client insights" on public.client_insights for all
using (public.is_organisation_member(organisation_id))
with check (public.is_organisation_member(organisation_id));
create index client_insights_org_status_idx on public.client_insights(organisation_id, status, generated_at desc);
create index client_insights_client_idx on public.client_insights(client_id, generated_at desc);
