alter table matters add column if not exists archived boolean not null default false;
alter table matters add column if not exists archived_at timestamptz;

create index if not exists idx_matters_archived on matters(archived);
