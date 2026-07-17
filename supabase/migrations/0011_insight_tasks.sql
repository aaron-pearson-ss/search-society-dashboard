alter table public.tasks
  add column if not exists source_insight_id uuid
  references public.client_insights(id) on delete set null;

create unique index if not exists tasks_source_insight_unique_idx
  on public.tasks(source_insight_id)
  where source_insight_id is not null;

create index if not exists tasks_source_insight_id_idx
  on public.tasks(source_insight_id);

comment on column public.tasks.source_insight_id is
  'The client insight that created this task. One task may be created per insight.';
