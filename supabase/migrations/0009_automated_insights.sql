alter table public.clients
  add column if not exists insights_last_analyzed_at timestamptz,
  add column if not exists insights_last_result_count integer not null default 0;

create index if not exists clients_insights_last_analyzed_idx
  on public.clients(organisation_id, insights_last_analyzed_at);
