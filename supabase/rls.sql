-- Phase 4 security hardening for Mission Control
-- Assumes you will authenticate as a single user first, then expand later.

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

-- Remove broad access if rerun
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

create policy authenticated_all_matters on matters
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_contacts on contacts
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_tasks on tasks
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_waiting_items on waiting_items
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_events on events
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_money_items on money_items
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_activity_log on activity_log
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_matter_notes on matter_notes
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_matter_milestones on matter_milestones
  for all
  to authenticated
  using (true)
  with check (true);

create policy authenticated_all_app_settings on app_settings
  for all
  to authenticated
  using (true)
  with check (true);

-- No anon policies: public visitors get nothing.
