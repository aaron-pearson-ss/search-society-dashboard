create type public.task_status as enum ('todo', 'in_progress', 'blocked', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

alter table public.clients
  add column if not exists renewal_date date,
  add column if not exists health_score integer not null default 75 check (health_score between 0 and 100),
  add column if not exists health_note text,
  add column if not exists services text[] not null default '{}';

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  owner_id uuid references auth.users(id) on delete set null,
  due_date date,
  is_recurring boolean not null default false,
  recurrence_rule text,
  completed_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks enable row level security;
create policy "members can view tasks" on public.tasks for select using (public.is_organisation_member(organisation_id));
create policy "members can create tasks" on public.tasks for insert with check (public.is_organisation_member(organisation_id) and created_by = auth.uid());
create policy "members can update tasks" on public.tasks for update using (public.is_organisation_member(organisation_id));
create policy "members can delete tasks" on public.tasks for delete using (public.is_organisation_member(organisation_id));

create index tasks_organisation_id_idx on public.tasks(organisation_id);
create index tasks_client_id_idx on public.tasks(client_id);
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_status_idx on public.tasks(status);
