insert into matters (id, title, client_name, stage, priority, status, owner, last_activity, next_action, blocker, projected_value, incident_date, statute_date)
values
  ('11111111-1111-4111-8111-111111111111', 'Jones v. Titan Logistics', 'Marcus Jones', 'Litigation', 'critical', 'Discovery pressure rising', 'Garrick', 'Opposing counsel requested extension today', 'Finalize Rule 26 disclosure draft', 'Need final wage loss backup', 250000, '2025-08-14', '2027-08-14'),
  ('22222222-2222-4222-8222-222222222222', 'Carter claim', 'Danielle Carter', 'Demand', 'high', 'Demand package out', 'Garrick', 'Mediation hold placed for April 9', 'Carrier call Friday', 'Waiting on adjuster response', 75000, '2025-10-02', '2027-10-02'),
  ('33333333-3333-4333-8333-333333333333', 'Reed claim', 'Sabrina Reed', 'Demand', 'high', 'Offer pending', 'Garrick', 'Client available to sign after 7 PM', 'Get signature and settlement authority', 'Client signature outstanding', 42500, '2025-11-28', '2027-11-28'),
  ('44444444-4444-4444-8444-444444444444', 'Young intake', 'Tyrone Young', 'Intake', 'medium', 'Police report still missing', 'Ops', 'Records request sent 2 days ago', 'Escalate records request', 'No police report yet', 18000, '2026-02-18', '2028-02-18'),
  ('55555555-5555-4555-8555-555555555555', 'Alvarez claim', 'Maria Alvarez', 'Resolution', 'medium', 'Settlement draft in finalization', 'Ops', 'Client call set for 9:00 AM', 'Finalize disbursement', 'Need last lien confirmation', 31000, '2025-06-03', '2027-06-03')
on conflict (id) do update set
  title = excluded.title,
  client_name = excluded.client_name,
  stage = excluded.stage,
  priority = excluded.priority,
  status = excluded.status,
  owner = excluded.owner,
  last_activity = excluded.last_activity,
  next_action = excluded.next_action,
  blocker = excluded.blocker,
  projected_value = excluded.projected_value,
  incident_date = excluded.incident_date,
  statute_date = excluded.statute_date;

insert into contacts (id, matter_id, name, role, phone, email)
values
  ('aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'Marcus Jones', 'client', '(602) 555-0101', 'marcus@example.com'),
  ('aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'Elaine Porter', 'defense_counsel', null, 'eporter@defensefirm.com'),
  ('aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '22222222-2222-4222-8222-222222222222', 'Danielle Carter', 'client', '(602) 555-0102', null),
  ('aaaaaaa4-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '22222222-2222-4222-8222-222222222222', 'State Farm Adjuster', 'adjuster', null, null),
  ('aaaaaaa5-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '33333333-3333-4333-8333-333333333333', 'Sabrina Reed', 'client', '(602) 555-0103', null),
  ('aaaaaaa6-aaaa-4aaa-8aaa-aaaaaaaaaaa6', '44444444-4444-4444-8444-444444444444', 'Tyrone Young', 'client', '(602) 555-0104', null)
on conflict (id) do update set
  matter_id = excluded.matter_id,
  name = excluded.name,
  role = excluded.role,
  phone = excluded.phone,
  email = excluded.email;

insert into tasks (id, matter_id, title, owner, due_at, priority, status)
values
  ('bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '11111111-1111-4111-8111-111111111111', 'Rule 26 disclosure draft', 'Garrick', now(), 'critical', 'open'),
  ('bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '33333333-3333-4333-8333-333333333333', 'Get demand package signed', 'Client', now(), 'high', 'waiting'),
  ('bbbbbbb3-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '22222222-2222-4222-8222-222222222222', 'Follow up with adjuster', 'Ops', now(), 'high', 'open'),
  ('bbbbbbb4-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '44444444-4444-4444-8444-444444444444', 'Obtain police report', 'Records', now(), 'medium', 'waiting'),
  ('bbbbbbb5-bbbb-4bbb-8bbb-bbbbbbbbbbb5', '55555555-5555-4555-8555-555555555555', 'Finalize settlement statement', 'Ops', now() + interval '1 day', 'medium', 'in_progress')
on conflict (id) do update set
  matter_id = excluded.matter_id,
  title = excluded.title,
  owner = excluded.owner,
  due_at = excluded.due_at,
  priority = excluded.priority,
  status = excluded.status;

insert into waiting_items (id, matter_id, subject, waiting_on, age_label, next_step)
values
  ('ccccccc1-cccc-4ccc-8ccc-ccccccccccc1', '22222222-2222-4222-8222-222222222222', 'State Farm adjuster response', 'Carrier', '9d', 'Chase tomorrow'),
  ('ccccccc2-cccc-4ccc-8ccc-ccccccccccc2', '44444444-4444-4444-8444-444444444444', 'Medical records packet', 'Provider', '12d', 'Escalate provider'),
  ('ccccccc3-cccc-4ccc-8ccc-ccccccccccc3', '33333333-3333-4333-8333-333333333333', 'Signed retainer / authority', 'Client', '3d', 'Text tonight'),
  ('ccccccc4-cccc-4ccc-8ccc-ccccccccccc4', '11111111-1111-4111-8111-111111111111', 'Court date confirmation', 'Court', '2d', 'Call clerk')
on conflict (id) do update set
  matter_id = excluded.matter_id,
  subject = excluded.subject,
  waiting_on = excluded.waiting_on,
  age_label = excluded.age_label,
  next_step = excluded.next_step;

insert into events (id, matter_id, starts_at, title, kind)
values
  ('ddddddd1-dddd-4ddd-8ddd-ddddddddddd1', '55555555-5555-4555-8555-555555555555', now(), 'Client call — Alvarez', 'Call'),
  ('ddddddd2-dddd-4ddd-8ddd-ddddddddddd2', '11111111-1111-4111-8111-111111111111', now(), 'Depo prep — Jones', 'Prep'),
  ('ddddddd3-dddd-4ddd-8ddd-ddddddddddd3', '22222222-2222-4222-8222-222222222222', now(), 'Demand review — Carter', 'Review'),
  ('ddddddd4-dddd-4ddd-8ddd-ddddddddddd4', '11111111-1111-4111-8111-111111111111', now(), 'Draft disclosure deadline — Titan', 'Deadline')
on conflict (id) do update set
  matter_id = excluded.matter_id,
  starts_at = excluded.starts_at,
  title = excluded.title,
  kind = excluded.kind;

insert into money_items (id, matter_id, status, amount, next_step)
values
  ('eeeeeee1-eeee-4eee-8eee-eeeeeeeeeee1', '22222222-2222-4222-8222-222222222222', 'Demand out', 75000, 'Carrier call Friday'),
  ('eeeeeee2-eeee-4eee-8eee-eeeeeeeeeee2', '33333333-3333-4333-8333-333333333333', 'Offer pending', 42500, 'Client authority needed'),
  ('eeeeeee3-eeee-4eee-8eee-eeeeeeeeeee3', '11111111-1111-4111-8111-111111111111', 'Suit posture', 250000, 'Depo prep'),
  ('eeeeeee4-eeee-4eee-8eee-eeeeeeeeeee4', '55555555-5555-4555-8555-555555555555', 'Settlement draft', 31000, 'Finalize disbursement')
on conflict (id) do update set
  matter_id = excluded.matter_id,
  status = excluded.status,
  amount = excluded.amount,
  next_step = excluded.next_step;

insert into activity_log (id, matter_id, activity_type, summary)
values
  ('fffffff1-ffff-4fff-8fff-fffffffffff1', '11111111-1111-4111-8111-111111111111', 'filing', 'Defense requested a two-week extension on disclosures.'),
  ('fffffff2-ffff-4fff-8fff-fffffffffff2', '11111111-1111-4111-8111-111111111111', 'note', 'Need wage loss backup before final disclosure package.'),
  ('fffffff3-ffff-4fff-8fff-fffffffffff3', '22222222-2222-4222-8222-222222222222', 'demand', 'Demand package confirmed delivered; follow-up call set for Friday.'),
  ('fffffff4-ffff-4fff-8fff-fffffffffff4', '33333333-3333-4333-8333-333333333333', 'note', 'Client says she can sign tonight after 7 PM.'),
  ('fffffff5-ffff-4fff-8fff-fffffffffff5', '55555555-5555-4555-8555-555555555555', 'settlement', 'Disbursement draft nearly complete; lien balance needs confirmation.')
on conflict (id) do update set
  matter_id = excluded.matter_id,
  activity_type = excluded.activity_type,
  summary = excluded.summary;

insert into matter_notes (id, matter_id, body)
values
  ('99999991-9999-4999-8999-999999999991', '11111111-1111-4111-8111-111111111111', 'Depo prep scheduled.'),
  ('99999992-9999-4999-8999-999999999992', '11111111-1111-4111-8111-111111111111', 'Defense requested a 2-week extension.'),
  ('99999993-9999-4999-8999-999999999993', '11111111-1111-4111-8111-111111111111', 'Court date confirmation still pending.'),
  ('99999994-9999-4999-8999-999999999994', '22222222-2222-4222-8222-222222222222', 'Demand delivered.'),
  ('99999995-9999-4999-8999-999999999995', '22222222-2222-4222-8222-222222222222', 'Adjuster response overdue.'),
  ('99999996-9999-4999-8999-999999999996', '22222222-2222-4222-8222-222222222222', 'Mediation hold looks promising.'),
  ('99999997-9999-4999-8999-999999999997', '33333333-3333-4333-8333-333333333333', 'Client responsive by text.'),
  ('99999998-9999-4999-8999-999999999998', '33333333-3333-4333-8333-333333333333', 'Settlement movement likely once authority confirmed.'),
  ('99999999-9999-4999-8999-999999999999', '44444444-4444-4444-8444-444444444444', 'Lead appears viable.'),
  ('88888881-8888-4888-8888-888888888881', '44444444-4444-4444-8444-444444444444', 'Need crash report and treatment confirmation.'),
  ('88888882-8888-4888-8888-888888888882', '55555555-5555-4555-8555-555555555555', 'Near fee realization.'),
  ('88888883-8888-4888-8888-888888888883', '55555555-5555-4555-8555-555555555555', 'Final paperwork should close this out quickly.')
on conflict (id) do update set
  matter_id = excluded.matter_id,
  body = excluded.body;
