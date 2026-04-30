alter table matters
  add column if not exists claim_number text,
  add column if not exists adjuster_name text,
  add column if not exists adjuster_phone text;