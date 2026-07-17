alter table public.tasks
  add column if not exists client_visible boolean not null default false,
  add column if not exists roadmap_stage text not null default 'planned'
    check (roadmap_stage in ('planned', 'in_progress', 'complete')),
  add column if not exists roadmap_order integer not null default 0;

update public.tasks
set roadmap_stage = case
  when status = 'done' then 'complete'
  when status = 'in_progress' then 'in_progress'
  else 'planned'
end
where roadmap_stage is null
   or roadmap_stage not in ('planned', 'in_progress', 'complete');

create index if not exists tasks_client_roadmap_idx
  on public.tasks(client_id, client_visible, roadmap_stage, roadmap_order, due_date);

create or replace function public.get_public_client_action_plan(
  target_client_id uuid
)
returns table (
  id uuid,
  title text,
  description text,
  status text,
  priority text,
  due_date date,
  completed_at timestamptz,
  completion_note text,
  roadmap_stage text,
  roadmap_order integer,
  owner_display_name text
)
language sql
security definer
set search_path = public, auth
stable
as $$
  select
    t.id,
    t.title,
    t.description,
    t.status::text,
    t.priority::text,
    t.due_date,
    t.completed_at,
    t.completion_note,
    t.roadmap_stage,
    t.roadmap_order,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      'Search Society team'
    ) as owner_display_name
  from public.tasks t
  left join auth.users u on u.id = t.owner_id
  where t.client_id = target_client_id
    and t.client_visible = true
  order by
    case t.roadmap_stage
      when 'in_progress' then 1
      when 'planned' then 2
      when 'complete' then 3
      else 4
    end,
    t.roadmap_order,
    t.due_date nulls last,
    t.created_at;
$$;

revoke all on function public.get_public_client_action_plan(uuid) from public;
revoke all on function public.get_public_client_action_plan(uuid) from anon;
revoke all on function public.get_public_client_action_plan(uuid) from authenticated;
grant execute on function public.get_public_client_action_plan(uuid)
  to service_role;

comment on column public.tasks.client_visible is
  'Controls whether the task appears in the client-facing action plan and published reports.';

comment on column public.tasks.roadmap_stage is
  'Client-facing roadmap stage: planned, in_progress or complete.';

comment on column public.tasks.roadmap_order is
  'Manual ordering value within the client action plan.';

comment on function public.get_public_client_action_plan(uuid) is
  'Service-role-only action plan projection for published client reports.';
