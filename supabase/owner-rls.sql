-- Owner-only RLS for Mission Control
-- Authorized owner email: garrick@gamesqlaw.com

create table if not exists authorized_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  created_at timestamptz not null default now()
);

alter table authorized_users enable row level security;

drop policy if exists authorized_users_self_read on authorized_users;
drop policy if exists authorized_users_service_manage on authorized_users;

create policy authorized_users_self_read on authorized_users
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Bootstrap owner row after first login/signup
insert into authorized_users (user_id, email)
select id, email
from auth.users
where lower(email) = 'garrick@gamesqlaw.com'
on conflict (user_id) do update set email = excluded.email;

-- Ensure owner-only policy coverage on every app-used table
alter table matters enable row level security;
alter table contacts enable row level security;
alter table tasks enable row level security;
alter table waiting_items enable row level security;
alter table events enable row level security;
alter table money_items enable row level security;
alter table activity_log enable row level security;
alter table matter_notes enable row level security;
alter table matter_milestones enable row level security;
alter table app_settings enable row level security;

-- Remove prior broad policies if they exist
 drop policy if exists authenticated_all_matters on matters;
 drop policy if exists authenticated_all_contacts on contacts;
 drop policy if exists authenticated_all_tasks on tasks;
 drop policy if exists authenticated_all_waiting_items on waiting_items;
 drop policy if exists authenticated_all_events on events;
 drop policy if exists authenticated_all_money_items on money_items;
 drop policy if exists authenticated_all_activity_log on activity_log;
 drop policy if exists authenticated_all_matter_notes on matter_notes;
 drop policy if exists authenticated_all_matter_milestones on matter_milestones;
 drop policy if exists authenticated_all_app_settings on app_settings;

create policy owner_only_matters on matters
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_contacts on contacts
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_tasks on tasks
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_waiting_items on waiting_items
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_events on events
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_money_items on money_items
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_activity_log on activity_log
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_matter_notes on matter_notes
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_matter_milestones on matter_milestones
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));

create policy owner_only_app_settings on app_settings
  for all
  to authenticated
  using (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'))
  with check (exists (select 1 from authorized_users au where au.user_id = auth.uid() and lower(au.email) = 'garrick@gamesqlaw.com'));
