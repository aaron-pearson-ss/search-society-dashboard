create table public.client_reports (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  date_from date not null,
  date_to date not null,
  comparison_date_from date not null,
  comparison_date_to date not null,
  executive_summary text not null default '',
  work_completed text not null default '',
  next_steps text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  public_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_from <= date_to),
  check (comparison_date_from <= comparison_date_to)
);

alter table public.client_reports enable row level security;

create policy "members can view client reports"
on public.client_reports for select
using (public.is_organisation_member(organisation_id));

create policy "members can create client reports"
on public.client_reports for insert
with check (created_by = auth.uid() and public.is_organisation_member(organisation_id));

create policy "members can update client reports"
on public.client_reports for update
using (public.is_organisation_member(organisation_id))
with check (public.is_organisation_member(organisation_id));

create policy "members can delete client reports"
on public.client_reports for delete
using (public.is_organisation_member(organisation_id));

create index client_reports_client_created_idx on public.client_reports(client_id, created_at desc);
create index client_reports_org_status_idx on public.client_reports(organisation_id, status, created_at desc);
