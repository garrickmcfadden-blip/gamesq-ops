-- GAMESQ Mission Control: shared full access for Garrick and Doug.
-- Run this once in the Supabase SQL Editor for the production project.
-- Authentication remains required; this only authorizes the listed identities.

drop policy if exists owner_only_matters on matters;
drop policy if exists owner_only_contacts on contacts;
drop policy if exists owner_only_tasks on tasks;
drop policy if exists owner_only_waiting_items on waiting_items;
drop policy if exists owner_only_events on events;
drop policy if exists owner_only_money_items on money_items;
drop policy if exists owner_only_activity_log on activity_log;
drop policy if exists owner_only_matter_notes on matter_notes;
drop policy if exists owner_only_matter_milestones on matter_milestones;
drop policy if exists owner_only_app_settings on app_settings;
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

create policy team_full_access_matters on matters for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_contacts on contacts for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_tasks on tasks for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_waiting_items on waiting_items for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_events on events for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_money_items on money_items for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_activity_log on activity_log for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_matter_notes on matter_notes for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_matter_milestones on matter_milestones for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
create policy team_full_access_app_settings on app_settings for all to authenticated
  using (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'))
  with check (lower(auth.jwt() ->> 'email') in ('garrick@gamesqlaw.com', 'doug@gamesqlaw.com'));
