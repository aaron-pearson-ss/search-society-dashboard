create extension if not exists pgcrypto;

create type public.organisation_role as enum ('owner', 'member', 'contractor', 'client');
create type public.client_status as enum ('onboarding', 'active', 'paused', 'churned');

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organisation_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  name text not null,
  domain text not null,
  status public.client_status not null default 'onboarding',
  account_manager_id uuid references auth.users(id) on delete set null,
  monthly_fee numeric(12,2) not null default 0,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  email text,
  role text,
  created_at timestamptz not null default now()
);

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_organisation_member(org_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organisation_members m where m.organisation_id = org_id and m.user_id = auth.uid()) $$;

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.clients enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_notes enable row level security;

create policy "members can view organisations" on public.organisations for select using (public.is_organisation_member(id));
create policy "members can view memberships" on public.organisation_members for select using (public.is_organisation_member(organisation_id));
create policy "members can view clients" on public.clients for select using (public.is_organisation_member(organisation_id));
create policy "members can create clients" on public.clients for insert with check (public.is_organisation_member(organisation_id));
create policy "members can update clients" on public.clients for update using (public.is_organisation_member(organisation_id));
create policy "members can delete clients" on public.clients for delete using (public.is_organisation_member(organisation_id));
create policy "members can view contacts" on public.client_contacts for select using (exists(select 1 from public.clients c where c.id = client_id and public.is_organisation_member(c.organisation_id)));
create policy "members can manage contacts" on public.client_contacts for all using (exists(select 1 from public.clients c where c.id = client_id and public.is_organisation_member(c.organisation_id))) with check (exists(select 1 from public.clients c where c.id = client_id and public.is_organisation_member(c.organisation_id)));
create policy "members can view notes" on public.client_notes for select using (exists(select 1 from public.clients c where c.id = client_id and public.is_organisation_member(c.organisation_id)));
create policy "members can create notes" on public.client_notes for insert with check (author_id = auth.uid() and exists(select 1 from public.clients c where c.id = client_id and public.is_organisation_member(c.organisation_id)));

create index clients_organisation_id_idx on public.clients(organisation_id);
create index client_contacts_client_id_idx on public.client_contacts(client_id);
create index client_notes_client_id_idx on public.client_notes(client_id);
