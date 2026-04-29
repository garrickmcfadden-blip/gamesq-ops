alter table matter_milestones add column if not exists complaint_filed_at timestamptz;
alter table matter_milestones add column if not exists service_completed_at timestamptz;
alter table matter_milestones add column if not exists discovery_responses_due_at timestamptz;
alter table matter_milestones add column if not exists depositions_completed_at timestamptz;
alter table matter_milestones add column if not exists mediation_scheduled_at timestamptz;
alter table matter_milestones add column if not exists mediation_completed_at timestamptz;
alter table matter_milestones add column if not exists trial_date timestamptz;

create index if not exists idx_matter_milestones_trial_date on matter_milestones(trial_date);
create index if not exists idx_matter_milestones_discovery_responses_due_at on matter_milestones(discovery_responses_due_at);
