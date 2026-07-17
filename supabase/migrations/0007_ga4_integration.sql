create table public.ga4_properties (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  google_connection_id uuid not null references public.google_connections(id) on delete cascade,
  property_id text not null,
  display_name text not null,
  client_id uuid references public.clients(id) on delete set null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, property_id)
);

create table public.ga4_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  property_id uuid not null references public.ga4_properties(id) on delete cascade,
  metric_date date not null,
  active_users integer not null default 0,
  sessions integer not null default 0,
  engaged_sessions integer not null default 0,
  key_events numeric not null default 0,
  total_revenue numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, metric_date)
);

create table public.ga4_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  property_id uuid not null references public.ga4_properties(id) on delete cascade,
  started_by uuid references auth.users(id) on delete set null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  date_from date,
  date_to date,
  rows_imported integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.ga4_properties enable row level security;
alter table public.ga4_daily_metrics enable row level security;
alter table public.ga4_sync_runs enable row level security;

create policy "members can manage ga4 properties" on public.ga4_properties for all
using (public.is_organisation_member(organisation_id))
with check (public.is_organisation_member(organisation_id));
create policy "members can manage ga4 metrics" on public.ga4_daily_metrics for all
using (public.is_organisation_member(organisation_id))
with check (public.is_organisation_member(organisation_id));
create policy "members can manage ga4 sync runs" on public.ga4_sync_runs for all
using (public.is_organisation_member(organisation_id))
with check (public.is_organisation_member(organisation_id));

create index ga4_properties_org_idx on public.ga4_properties(organisation_id);
create index ga4_properties_client_idx on public.ga4_properties(client_id);
create index ga4_metrics_client_date_idx on public.ga4_daily_metrics(client_id, metric_date);
create index ga4_sync_runs_client_idx on public.ga4_sync_runs(client_id, started_at desc);
