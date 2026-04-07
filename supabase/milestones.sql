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
  settlement_reached_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table matter_milestones add column if not exists letter_of_rep_sent_at timestamptz;
alter table matter_milestones add column if not exists adjuster_notice_2_week_at timestamptz;
alter table matter_milestones add column if not exists adjuster_notice_30_day_at timestamptz;
alter table matter_milestones add column if not exists adjuster_notice_60_day_at timestamptz;
alter table matter_milestones add column if not exists adjuster_notice_90_day_at timestamptz;

create index if not exists idx_matter_milestones_retainer_signed_at on matter_milestones(retainer_signed_at);
create index if not exists idx_matter_milestones_demand_sent_at on matter_milestones(demand_sent_at);
create index if not exists idx_matter_milestones_letter_of_rep_sent_at on matter_milestones(letter_of_rep_sent_at);
