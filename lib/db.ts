import { supabase } from '@/lib/supabase';
import { ActivityItem, Contact, EventItem, Matter, MatterMilestone, MoneyItem, Task, WaitingItem } from '@/lib/types';

function currency(value: number | null) {
  if (value == null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function numericCurrency(value?: string) {
  if (!value) return null;
  const numeric = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
}

export async function fetchMatters(): Promise<Matter[]> {
  const { data, error } = await supabase.from('matters').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const matterIds = data.map((row) => row.id);
  const notesMap = new Map<string, Matter['notes']>();
  if (matterIds.length) {
    const { data: notesData } = await supabase.from('matter_notes').select('id, matter_id, body, created_at').in('matter_id', matterIds).order('created_at', { ascending: false });
    (notesData ?? []).forEach((note) => {
      const bucket = notesMap.get(note.matter_id) ?? [];
      bucket.push({ id: note.id, matterId: note.matter_id, body: note.body, createdAt: note.created_at ?? undefined });
      notesMap.set(note.matter_id, bucket);
    });
  }
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    client: row.client_name,
    claimNumber: row.claim_number ?? undefined,
    adjusterName: row.adjuster_name ?? undefined,
    adjusterPhone: row.adjuster_phone ?? undefined,
    stage: row.stage,
    priority: row.priority,
    status: row.status,
    owner: row.owner,
    lastActivity: row.last_activity,
    nextAction: row.next_action,
    blocker: row.blocker ?? undefined,
    value: currency(row.projected_value),
    incidentDate: row.incident_date ?? '',
    statute: row.statute_date ?? '',
    sourceType: row.source_type ?? undefined,
    sourceDetail: row.source_detail ?? undefined,
    campaign: row.campaign ?? undefined,
    archived: row.archived ?? false,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    notes: notesMap.get(row.id) ?? [],
  }));
}

export async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, matterId: row.matter_id ?? undefined, name: row.name, role: row.role, phone: row.phone ?? undefined, email: row.email ?? undefined }));
}

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, matterId: row.matter_id, title: row.title, owner: row.owner, due: row.due_at ?? 'No due date', priority: row.priority, status: row.status }));
}

export async function fetchWaitingItems(): Promise<WaitingItem[]> {
  const { data, error } = await supabase.from('waiting_items').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, matterId: row.matter_id, subject: row.subject, waitingOn: row.waiting_on, age: row.age_label ?? '', next: row.next_step ?? '' }));
}

export async function fetchEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase.from('events').select('*').order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    matterId: row.matter_id ?? undefined,
    time: row.starts_at ? new Date(row.starts_at).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '',
    startsAt: row.starts_at ?? undefined,
    title: row.title,
    type: row.kind,
  }));
}

export async function fetchMoneyItems(): Promise<MoneyItem[]> {
  const { data, error } = await supabase.from('money_items').select('*').order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, matterId: row.matter_id, status: row.status, amount: currency(row.amount), next: row.next_step ?? '' }));
}

export async function fetchActivity(): Promise<ActivityItem[]> {
  const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, matterId: row.matter_id, createdAt: new Date(row.created_at).toLocaleString(), type: row.activity_type, summary: row.summary }));
}

export async function updateMatterRecord(matterId: string, updates: Partial<Matter>) {
  const payload: Record<string, unknown> = {};
  if (updates.nextAction !== undefined) payload.next_action = updates.nextAction;
  if (updates.blocker !== undefined) payload.blocker = updates.blocker || null;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.stage !== undefined) payload.stage = updates.stage;
  if (updates.priority !== undefined) payload.priority = updates.priority;
  if (updates.owner !== undefined) payload.owner = updates.owner;
  if (updates.lastActivity !== undefined) payload.last_activity = updates.lastActivity;
  if (updates.incidentDate !== undefined) payload.incident_date = updates.incidentDate || null;
  if (updates.statute !== undefined) payload.statute_date = updates.statute || null;
  if (updates.claimNumber !== undefined) payload.claim_number = updates.claimNumber || null;
  if (updates.adjusterName !== undefined) payload.adjuster_name = updates.adjusterName || null;
  if (updates.adjusterPhone !== undefined) payload.adjuster_phone = updates.adjusterPhone || null;
  if (updates.value !== undefined) payload.projected_value = numericCurrency(updates.value);
  if (updates.sourceType !== undefined) payload.source_type = updates.sourceType || null;
  if (updates.sourceDetail !== undefined) payload.source_detail = updates.sourceDetail || null;
  if (updates.campaign !== undefined) payload.campaign = updates.campaign || null;
  if (updates.archived !== undefined) {
    payload.archived = updates.archived;
    if (!updates.archived) payload.archived_at = null;
  }
  if (updates.archivedAt !== undefined) payload.archived_at = updates.archivedAt || null;
  const { error } = await supabase.from('matters').update(payload).eq('id', matterId);
  if (error) throw error;
}

export async function updateTaskRecord(taskId: string, status: Task['status']) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
  if (error) throw error;
}

export async function createTaskRecord(task: Omit<Task, 'id'>) {
  const { error } = await supabase.from('tasks').insert({
    matter_id: task.matterId,
    title: task.title,
    owner: task.owner,
    due_at: task.due,
    priority: task.priority,
    status: task.status,
  });
  if (error) throw error;
}

export async function createMatterRecord(input: {
  title: string;
  client: string;
  stage: Matter['stage'];
  priority: Matter['priority'];
  status: string;
  owner: string;
  nextAction: string;
  blocker?: string;
  projectedValue?: string;
  incidentDate?: string;
  statute?: string;
  claimNumber?: string;
  adjusterName?: string;
  adjusterPhone?: string;
}) {
  const { data, error } = await supabase
    .from('matters')
    .insert({
      title: input.title,
      client_name: input.client,
      stage: input.stage,
      priority: input.priority,
      status: input.status,
      owner: input.owner,
      last_activity: 'Matter created in Mission Control',
      next_action: input.nextAction,
      blocker: input.blocker || null,
      projected_value: numericCurrency(input.projectedValue),
      incident_date: input.incidentDate || null,
      statute_date: input.statute || null,
      claim_number: input.claimNumber || null,
      adjuster_name: input.adjusterName || null,
      adjuster_phone: input.adjusterPhone || null,
      source_type: null,
      source_detail: null,
      campaign: null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createContactRecord(input: { matterId: string; name: string; role: Contact['role']; phone?: string; email?: string }) {
  const { error } = await supabase.from('contacts').insert({
    matter_id: input.matterId,
    name: input.name,
    role: input.role,
    phone: input.phone || null,
    email: input.email || null,
  });
  if (error) throw error;
}

export async function createWaitingItemRecord(input: { matterId: string; subject: string; waitingOn: string; age?: string; next?: string }) {
  const { error } = await supabase.from('waiting_items').insert({
    matter_id: input.matterId,
    subject: input.subject,
    waiting_on: input.waitingOn,
    age_label: input.age || null,
    next_step: input.next || null,
  });
  if (error) throw error;
}

export async function createActivityRecord(input: { matterId: string; type: ActivityItem['type']; summary: string }) {
  const { error } = await supabase.from('activity_log').insert({
    matter_id: input.matterId,
    activity_type: input.type,
    summary: input.summary,
  });
  if (error) throw error;
}

export async function createMoneyItemRecord(input: { matterId: string; status: string; amount?: string; next?: string }) {
  const { error } = await supabase.from('money_items').insert({
    matter_id: input.matterId,
    status: input.status,
    amount: numericCurrency(input.amount),
    next_step: input.next || null,
  });
  if (error) throw error;
}

export async function createMatterNoteRecord(input: { matterId: string; body: string }) {
  const { data, error } = await supabase.from('matter_notes').insert({
    matter_id: input.matterId,
    body: input.body,
  }).select('id, matter_id, body, created_at').single();
  if (error) throw error;
  return { id: data.id, matterId: data.matter_id, body: data.body, createdAt: data.created_at ?? undefined };
}

export async function createEventRecord(input: { matterId?: string; title: string; kind: string; startsAt?: string }) {
  const { error } = await supabase.from('events').insert({
    matter_id: input.matterId || null,
    title: input.title,
    kind: input.kind,
    starts_at: input.startsAt || null,
  });
  if (error) throw error;
}

export async function upsertMatterMilestoneRecord(matterId: string, updates: Partial<MatterMilestone>) {
  const payload: Record<string, unknown> = { matter_id: matterId };
  if (updates.leadCreatedAt !== undefined) payload.lead_created_at = updates.leadCreatedAt || null;
  if (updates.letterOfRepSentAt !== undefined) payload.letter_of_rep_sent_at = updates.letterOfRepSentAt || null;
  if (updates.adjusterNotice2WeekAt !== undefined) payload.adjuster_notice_2_week_at = updates.adjusterNotice2WeekAt || null;
  if (updates.adjusterNotice30DayAt !== undefined) payload.adjuster_notice_30_day_at = updates.adjusterNotice30DayAt || null;
  if (updates.adjusterNotice60DayAt !== undefined) payload.adjuster_notice_60_day_at = updates.adjusterNotice60DayAt || null;
  if (updates.adjusterNotice90DayAt !== undefined) payload.adjuster_notice_90_day_at = updates.adjusterNotice90DayAt || null;
  if (updates.retainerSentAt !== undefined) payload.retainer_sent_at = updates.retainerSentAt || null;
  if (updates.retainerSignedAt !== undefined) payload.retainer_signed_at = updates.retainerSignedAt || null;
  if (updates.recordsFirstOrderedAt !== undefined) payload.records_first_ordered_at = updates.recordsFirstOrderedAt || null;
  if (updates.recordsReceivedAt !== undefined) payload.records_received_at = updates.recordsReceivedAt || null;
  if (updates.demandSentAt !== undefined) payload.demand_sent_at = updates.demandSentAt || null;
  if (updates.firstOfferAt !== undefined) payload.first_offer_at = updates.firstOfferAt || null;
  if (updates.defendantAnswerReceivedAt !== undefined) payload.defendant_answer_received_at = updates.defendantAnswerReceivedAt || null;
  if (updates.disclosureStatementSentAt !== undefined) payload.disclosure_statement_sent_at = updates.disclosureStatementSentAt || null;
  if (updates.firstDiscoverySentAt !== undefined) payload.first_discovery_sent_at = updates.firstDiscoverySentAt || null;
  if (updates.complaintFiledAt !== undefined) payload.complaint_filed_at = updates.complaintFiledAt || null;
  if (updates.serviceCompletedAt !== undefined) payload.service_completed_at = updates.serviceCompletedAt || null;
  if (updates.discoveryResponsesDueAt !== undefined) payload.discovery_responses_due_at = updates.discoveryResponsesDueAt || null;
  if (updates.depositionsCompletedAt !== undefined) payload.depositions_completed_at = updates.depositionsCompletedAt || null;
  if (updates.mediationScheduledAt !== undefined) payload.mediation_scheduled_at = updates.mediationScheduledAt || null;
  if (updates.mediationCompletedAt !== undefined) payload.mediation_completed_at = updates.mediationCompletedAt || null;
  if (updates.trialDate !== undefined) payload.trial_date = updates.trialDate || null;
  if (updates.settlementReachedAt !== undefined) payload.settlement_reached_at = updates.settlementReachedAt || null;
  if (updates.settlementPaperworkReceivedAt !== undefined) payload.settlement_paperwork_received_at = updates.settlementPaperworkReceivedAt || null;
  if (updates.settlementPaperworkSentAt !== undefined) payload.settlement_paperwork_sent_at = updates.settlementPaperworkSentAt || null;
  if (updates.settlementCheckReceivedAt !== undefined) payload.settlement_check_received_at = updates.settlementCheckReceivedAt || null;
  if (updates.clientCheckSentAt !== undefined) payload.client_check_sent_at = updates.clientCheckSentAt || null;
  const { error } = await supabase.from('matter_milestones').upsert(payload, { onConflict: 'matter_id' });
  if (error) throw error;
}

export async function fetchMatterMilestones(): Promise<MatterMilestone[]> {
  const { data, error } = await supabase.from('matter_milestones').select('*');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    matterId: row.matter_id,
    leadCreatedAt: row.lead_created_at ?? undefined,
    letterOfRepSentAt: row.letter_of_rep_sent_at ?? undefined,
    adjusterNotice2WeekAt: row.adjuster_notice_2_week_at ?? undefined,
    adjusterNotice30DayAt: row.adjuster_notice_30_day_at ?? undefined,
    adjusterNotice60DayAt: row.adjuster_notice_60_day_at ?? undefined,
    adjusterNotice90DayAt: row.adjuster_notice_90_day_at ?? undefined,
    retainerSentAt: row.retainer_sent_at ?? undefined,
    retainerSignedAt: row.retainer_signed_at ?? undefined,
    recordsFirstOrderedAt: row.records_first_ordered_at ?? undefined,
    recordsReceivedAt: row.records_received_at ?? undefined,
    demandSentAt: row.demand_sent_at ?? undefined,
    firstOfferAt: row.first_offer_at ?? undefined,
    defendantAnswerReceivedAt: row.defendant_answer_received_at ?? undefined,
    disclosureStatementSentAt: row.disclosure_statement_sent_at ?? undefined,
    firstDiscoverySentAt: row.first_discovery_sent_at ?? undefined,
    complaintFiledAt: row.complaint_filed_at ?? undefined,
    serviceCompletedAt: row.service_completed_at ?? undefined,
    discoveryResponsesDueAt: row.discovery_responses_due_at ?? undefined,
    depositionsCompletedAt: row.depositions_completed_at ?? undefined,
    mediationScheduledAt: row.mediation_scheduled_at ?? undefined,
    mediationCompletedAt: row.mediation_completed_at ?? undefined,
    trialDate: row.trial_date ?? undefined,
    settlementReachedAt: row.settlement_reached_at ?? undefined,
    settlementPaperworkReceivedAt: row.settlement_paperwork_received_at ?? undefined,
    settlementPaperworkSentAt: row.settlement_paperwork_sent_at ?? undefined,
    settlementCheckReceivedAt: row.settlement_check_received_at ?? undefined,
    clientCheckSentAt: row.client_check_sent_at ?? undefined,
  }));
}

export async function fetchAppSettings() {
  const { data, error } = await supabase.from('app_settings').select('*');
  if (error) throw error;
  return data ?? [];
}

export async function upsertAppSetting(key: string, value: unknown) {
  const { error } = await supabase.from('app_settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}

export async function deleteTaskRecord(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

export async function deleteEventRecord(eventId: string) {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  if (error) throw error;
}

export async function deleteWaitingItemRecord(waitingItemId: string) {
  const { error } = await supabase.from('waiting_items').delete().eq('id', waitingItemId);
  if (error) throw error;
}

export async function deleteMoneyItemRecord(moneyItemId: string) {
  const { error } = await supabase.from('money_items').delete().eq('id', moneyItemId);
  if (error) throw error;
}

export async function deleteMatterNoteRecord(noteId: string) {
  const { error } = await supabase.from('matter_notes').delete().eq('id', noteId);
  if (error) throw error;
}

export async function updateEventRecord(eventId: string, input: { title: string; kind: string; startsAt?: string }) {
  const { error } = await supabase.from('events').update({ title: input.title, kind: input.kind, starts_at: input.startsAt || null }).eq('id', eventId);
  if (error) throw error;
}

export async function updateWaitingItemRecord(waitingItemId: string, input: { subject: string; waitingOn: string; age?: string; next?: string }) {
  const { error } = await supabase.from('waiting_items').update({ subject: input.subject, waiting_on: input.waitingOn, age_label: input.age || null, next_step: input.next || null }).eq('id', waitingItemId);
  if (error) throw error;
}

export async function updateMoneyItemRecord(moneyItemId: string, input: { status: string; amount?: string; next?: string }) {
  const { error } = await supabase.from('money_items').update({ status: input.status, amount: numericCurrency(input.amount), next_step: input.next || null }).eq('id', moneyItemId);
  if (error) throw error;
}
