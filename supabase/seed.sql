-- Run after creating your first Supabase Auth user.
-- Replace the values below.
insert into public.organisations (name, slug)
values ('My Agency', 'my-agency');

insert into public.organisation_members (organisation_id, user_id, role)
select id, 'REPLACE_WITH_AUTH_USER_UUID'::uuid, 'owner'
from public.organisations where slug = 'my-agency';
