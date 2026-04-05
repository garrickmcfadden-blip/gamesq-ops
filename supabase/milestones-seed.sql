insert into matter_milestones (
  matter_id,
  lead_created_at,
  retainer_sent_at,
  retainer_signed_at,
  records_first_ordered_at,
  records_received_at,
  demand_sent_at,
  first_offer_at,
  settlement_reached_at
)
values
  ('11111111-1111-4111-8111-111111111111', '2025-08-16', '2025-08-17', '2025-08-18', '2025-11-01', '2025-12-02', '2026-01-15', '2026-02-03', null),
  ('22222222-2222-4222-8222-222222222222', '2025-10-03', '2025-10-04', '2025-10-05', '2026-01-20', '2026-02-14', '2026-03-01', '2026-03-12', null),
  ('33333333-3333-4333-8333-333333333333', '2025-11-29', '2025-11-30', '2025-12-01', '2026-02-05', '2026-02-26', '2026-03-15', null, null),
  ('44444444-4444-4444-8444-444444444444', '2026-02-18', '2026-02-19', null, null, null, null, null, null),
  ('55555555-5555-4555-8555-555555555555', '2025-06-05', '2025-06-06', '2025-06-07', '2025-08-10', '2025-09-02', '2025-10-01', '2025-10-17', '2026-03-10')
on conflict (matter_id) do update set
  lead_created_at = excluded.lead_created_at,
  retainer_sent_at = excluded.retainer_sent_at,
  retainer_signed_at = excluded.retainer_signed_at,
  records_first_ordered_at = excluded.records_first_ordered_at,
  records_received_at = excluded.records_received_at,
  demand_sent_at = excluded.demand_sent_at,
  first_offer_at = excluded.first_offer_at,
  settlement_reached_at = excluded.settlement_reached_at,
  updated_at = now();
