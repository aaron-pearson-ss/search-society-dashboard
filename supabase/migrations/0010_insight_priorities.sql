alter table public.client_insights
  add column if not exists impact_score integer not null default 0,
  add column if not exists priority text not null default 'low';

alter table public.client_insights
  drop constraint if exists client_insights_impact_score_check;

alter table public.client_insights
  add constraint client_insights_impact_score_check
  check (impact_score between 0 and 100);

alter table public.client_insights
  drop constraint if exists client_insights_priority_check;

alter table public.client_insights
  add constraint client_insights_priority_check
  check (priority in ('high', 'medium', 'low'));

create index if not exists client_insights_priority_score_idx
  on public.client_insights (
    organisation_id,
    status,
    priority,
    impact_score desc
  );

comment on column public.client_insights.impact_score is
  'Calculated business-impact score from 0 to 100.';

comment on column public.client_insights.priority is
  'Priority band derived from impact_score: high, medium or low.';
