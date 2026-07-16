create table public.gsc_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  property_id uuid not null references public.gsc_properties(id) on delete cascade,
  metric_date date not null,
  search_type text not null default 'web',
  clicks numeric not null default 0,
  impressions numeric not null default 0,
  ctr numeric not null default 0,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, metric_date, search_type)
);

create table public.gsc_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  property_id uuid not null references public.gsc_properties(id) on delete cascade,
  started_by uuid references auth.users(id) on delete set null,
  status text not null check (status in ('running', 'completed', 'failed')),
  date_from date not null,
  date_to date not null,
  rows_imported integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.gsc_daily_metrics enable row level security;
alter table public.gsc_sync_runs enable row level security;

create policy "members can view gsc daily metrics"
on public.gsc_daily_metrics for select
using (public.is_organisation_member(organisation_id));

create policy "members can create gsc daily metrics"
on public.gsc_daily_metrics for insert
with check (public.is_organisation_member(organisation_id));

create policy "members can update gsc daily metrics"
on public.gsc_daily_metrics for update
using (public.is_organisation_member(organisation_id))
with check (public.is_organisation_member(organisation_id));

create policy "members can view gsc sync runs"
on public.gsc_sync_runs for select
using (public.is_organisation_member(organisation_id));

create policy "members can create gsc sync runs"
on public.gsc_sync_runs for insert
with check (started_by = auth.uid() and public.is_organisation_member(organisation_id));

create policy "members can update gsc sync runs"
on public.gsc_sync_runs for update
using (started_by = auth.uid() and public.is_organisation_member(organisation_id))
with check (started_by = auth.uid() and public.is_organisation_member(organisation_id));

create index gsc_daily_metrics_client_date_idx on public.gsc_daily_metrics(client_id, metric_date desc);
create index gsc_daily_metrics_property_date_idx on public.gsc_daily_metrics(property_id, metric_date desc);
create index gsc_sync_runs_client_started_idx on public.gsc_sync_runs(client_id, started_at desc);
