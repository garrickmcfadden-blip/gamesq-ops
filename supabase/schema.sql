create extension if not exists pgcrypto;

create type matter_stage as enum ('Intake', 'Treatment', 'Demand', 'Litigation', 'Resolution');
create type priority_level as enum ('critical', 'high', 'medium', 'low');
create type task_status as enum ('open', 'in_progress', 'waiting', 'done');
create type contact_role as enum ('client', 'adjuster', 'provider', 'defense_counsel', 'court', 'witness', 'other');
create type activity_type as enum ('note', 'call', 'email', 'deadline', 'demand', 'filing', 'settlement');

create table if not exists matters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  client_name text not null,
  stage matter_stage not null default 'Intake',
  priority priority_level not null default 'medium',
  status text not null default '',
  owner text not null default 'Garrick',
  last_activity text not null default '',
  next_action text not null default '',
  blocker text,
  projected_value numeric(12,2),
  incident_date date,
  statute_date date,
  claim_number text,
  adjuster_name text,
  adjuster_phone text,
  source_type text,
  source_detail text,
  campaign text,
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid references matters(id) on delete cascade,
  name text not null,
  role contact_role not null default 'other',
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references matters(id) on delete cascade,
  title text not null,
  owner text not null,
  due_at timestamptz,
  priority priority_level not null default 'medium',
  status task_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists waiting_items (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references matters(id) on delete cascade,
  subject text not null,
  waiting_on text not null,
  age_label text,
  next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid references matters(id) on delete set null,
  starts_at timestamptz,
  title text not null,
  kind text not null default 'event',
  created_at timestamptz not null default now()
);

create table if not exists money_items (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references matters(id) on delete cascade,
  status text not null,
  amount numeric(12,2),
  next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references matters(id) on delete cascade,
  activity_type activity_type not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists matter_notes (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references matters(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists matter_milestones (
  matter_id uuid primary key references matters(id) on delete cascade,
  lead_created_at timestamptz,
  letter_of_rep_sent_at timestamptz,
  adjuster_notice_2_week_at timestamptz,
  adjuster_notice_30_day_at timestamptz,
  adjuster_notice_60_day_at timestamptz,
  adjuster_notice_90_day_at timestamptz,
  retainer_sent_at timestamptz,
  retainer_signed_at timestamptz,
  records_first_ordered_at timestamptz,
  records_received_at timestamptz,
  demand_sent_at timestamptz,
  first_offer_at timestamptz,
  defendant_answer_received_at timestamptz,
  disclosure_statement_sent_at timestamptz,
  first_discovery_sent_at timestamptz,
  complaint_filed_at timestamptz,
  service_completed_at timestamptz,
  discovery_responses_due_at timestamptz,
  depositions_completed_at timestamptz,
  mediation_scheduled_at timestamptz,
  mediation_completed_at timestamptz,
  trial_date timestamptz,
  settlement_reached_at timestamptz,
  settlement_paperwork_received_at timestamptz,
  settlement_paperwork_sent_at timestamptz,
  settlement_check_received_at timestamptz,
  client_check_sent_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_matter_id on tasks(matter_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_waiting_items_matter_id on waiting_items(matter_id);
create index if not exists idx_events_starts_at on events(starts_at);
create index if not exists idx_activity_log_matter_id on activity_log(matter_id);
create index if not exists idx_matters_archived on matters(archived);
create index if not exists idx_matter_milestones_retainer_signed_at on matter_milestones(retainer_signed_at);
create index if not exists idx_matter_milestones_demand_sent_at on matter_milestones(demand_sent_at);
create index if not exists idx_matter_milestones_letter_of_rep_sent_at on matter_milestones(letter_of_rep_sent_at);
create index if not exists idx_matter_milestones_defendant_answer_received_at on matter_milestones(defendant_answer_received_at);
create index if not exists idx_matter_milestones_disclosure_statement_sent_at on matter_milestones(disclosure_statement_sent_at);
create index if not exists idx_matter_milestones_first_discovery_sent_at on matter_milestones(first_discovery_sent_at);
create index if not exists idx_matter_milestones_trial_date on matter_milestones(trial_date);
create index if not exists idx_matter_milestones_discovery_responses_due_at on matter_milestones(discovery_responses_due_at);
create index if not exists idx_matter_milestones_settlement_paperwork_received_at on matter_milestones(settlement_paperwork_received_at);
create index if not exists idx_matter_milestones_client_check_sent_at on matter_milestones(client_check_sent_at);
