create table public.gsc_dimension_metrics (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  property_id uuid not null references public.gsc_properties(id) on delete cascade,
  dimension_type text not null check (dimension_type in ('query', 'page')),
  dimension_value text not null,
  period_key text not null check (period_key in ('current', 'previous')),
  date_from date not null,
  date_to date not null,
  clicks numeric not null default 0,
  impressions numeric not null default 0,
  ctr numeric not null default 0,
  position numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, dimension_type, dimension_value, period_key)
);

alter table public.gsc_dimension_metrics enable row level security;

create policy "members can view gsc dimension metrics"
on public.gsc_dimension_metrics for select
using (public.is_organisation_member(organisation_id));

create policy "members can create gsc dimension metrics"
on public.gsc_dimension_metrics for insert
with check (public.is_organisation_member(organisation_id));

create policy "members can update gsc dimension metrics"
on public.gsc_dimension_metrics for update
using (public.is_organisation_member(organisation_id))
with check (public.is_organisation_member(organisation_id));

create policy "members can delete gsc dimension metrics"
on public.gsc_dimension_metrics for delete
using (public.is_organisation_member(organisation_id));

create index gsc_dimension_metrics_client_type_period_idx
on public.gsc_dimension_metrics(client_id, dimension_type, period_key);

create index gsc_dimension_metrics_property_type_period_idx
on public.gsc_dimension_metrics(property_id, dimension_type, period_key);
