alter table matter_milestones add column if not exists first_discovery_sent_at timestamptz;

create index if not exists idx_matter_milestones_first_discovery_sent_at on matter_milestones(first_discovery_sent_at);
