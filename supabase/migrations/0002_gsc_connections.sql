create table public.google_connections (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  google_email text,
  encrypted_refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, user_id)
);

create table public.gsc_properties (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  google_connection_id uuid not null references public.google_connections(id) on delete cascade,
  site_url text not null,
  permission_level text,
  client_id uuid references public.clients(id) on delete set null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, site_url)
);

alter table public.google_connections enable row level security;
alter table public.gsc_properties enable row level security;

create policy "members can view google connections"
on public.google_connections for select
using (public.is_organisation_member(organisation_id));

create policy "members can create google connections"
on public.google_connections for insert
with check (user_id = auth.uid() and public.is_organisation_member(organisation_id));

create policy "members can update own google connections"
on public.google_connections for update
using (user_id = auth.uid() and public.is_organisation_member(organisation_id))
with check (user_id = auth.uid() and public.is_organisation_member(organisation_id));

create policy "members can view gsc properties"
on public.gsc_properties for select
using (public.is_organisation_member(organisation_id));

create policy "members can create gsc properties"
on public.gsc_properties for insert
with check (public.is_organisation_member(organisation_id));

create policy "members can update gsc properties"
on public.gsc_properties for update
using (public.is_organisation_member(organisation_id))
with check (public.is_organisation_member(organisation_id));

create index google_connections_org_idx on public.google_connections(organisation_id);
create index gsc_properties_org_idx on public.gsc_properties(organisation_id);
create index gsc_properties_client_idx on public.gsc_properties(client_id);
