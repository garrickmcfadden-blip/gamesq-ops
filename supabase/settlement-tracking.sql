alter table matter_milestones add column if not exists settlement_paperwork_received_at timestamptz;
alter table matter_milestones add column if not exists settlement_paperwork_sent_at timestamptz;
alter table matter_milestones add column if not exists settlement_check_received_at timestamptz;
alter table matter_milestones add column if not exists client_check_sent_at timestamptz;

create index if not exists idx_matter_milestones_settlement_paperwork_received_at on matter_milestones(settlement_paperwork_received_at);
create index if not exists idx_matter_milestones_client_check_sent_at on matter_milestones(client_check_sent_at);
