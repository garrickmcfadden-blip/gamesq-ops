import { supabase } from '@/lib/supabase';
import { ActivityItem, Contact, EventItem, Matter, MatterMilestone, MoneyItem, Task, WaitingItem } from '@/lib/types';

function currency(value: number | null) {
  if (value == null) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export async function fetchMatters(): Promise<Matter[]> {
  const { data, error } = await supabase.from('matters').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  const matterIds = data.map((row) => row.id);
  const notesMap = new Map<string, string[]>();
  if (matterIds.length) {
    const { data: notesData } = await supabase.from('matter_notes').select('matter_id, body').in('matter_id', matterIds).order('created_at', { ascending: false });
    (notesData ?? []).forEach((note) => {
      const bucket = notesMap.get(note.matter_id) ?? [];
      bucket.push(note.body);
      notesMap.set(note.matter_id, bucket);
    });
  }
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    client: row.client_name,
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
  if (updates.lastActivity !== undefined) payload.last_activity = updates.lastActivity;
  if (updates.sourceType !== undefined) payload.source_type = updates.sourceType || null;
  if (updates.sourceDetail !== undefined) payload.source_detail = updates.sourceDetail || null;
  if (updates.campaign !== undefined) payload.campaign = updates.campaign || null;
  if (updates.archived !== undefined) payload.archived = updates.archived;
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
      projected_value: input.projectedValue ? Number(input.projectedValue) : null,
      incident_date: input.incidentDate || null,
      statute_date: input.statute || null,
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
    amount: input.amount ? Number(input.amount) : null,
    next_step: input.next || null,
  });
  if (error) throw error;
}

export async function createMatterNoteRecord(input: { matterId: string; body: string }) {
  const { error } = await supabase.from('matter_notes').insert({
    matter_id: input.matterId,
    body: input.body,
  });
  if (error) throw error;
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
  if (updates.retainerSentAt !== undefined) payload.retainer_sent_at = updates.retainerSentAt || null;
  if (updates.retainerSignedAt !== undefined) payload.retainer_signed_at = updates.retainerSignedAt || null;
  if (updates.recordsFirstOrderedAt !== undefined) payload.records_first_ordered_at = updates.recordsFirstOrderedAt || null;
  if (updates.recordsReceivedAt !== undefined) payload.records_received_at = updates.recordsReceivedAt || null;
  if (updates.demandSentAt !== undefined) payload.demand_sent_at = updates.demandSentAt || null;
  if (updates.firstOfferAt !== undefined) payload.first_offer_at = updates.firstOfferAt || null;
  if (updates.settlementReachedAt !== undefined) payload.settlement_reached_at = updates.settlementReachedAt || null;
  const { error } = await supabase.from('matter_milestones').upsert(payload, { onConflict: 'matter_id' });
  if (error) throw error;
}

export async function fetchMatterMilestones(): Promise<MatterMilestone[]> {
  const { data, error } = await supabase.from('matter_milestones').select('*');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    matterId: row.matter_id,
    leadCreatedAt: row.lead_created_at ?? undefined,
    retainerSentAt: row.retainer_sent_at ?? undefined,
    retainerSignedAt: row.retainer_signed_at ?? undefined,
    recordsFirstOrderedAt: row.records_first_ordered_at ?? undefined,
    recordsReceivedAt: row.records_received_at ?? undefined,
    demandSentAt: row.demand_sent_at ?? undefined,
    firstOfferAt: row.first_offer_at ?? undefined,
    settlementReachedAt: row.settlement_reached_at ?? undefined,
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

export async function deleteMatterNoteRecord(matterId: string, body: string) {
  const { error } = await supabase.from('matter_notes').delete().eq('matter_id', matterId).eq('body', body);
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
  const { error } = await supabase.from('money_items').update({ status: input.status, amount: input.amount ? Number(input.amount) : null, next_step: input.next || null }).eq('id', moneyItemId);
  if (error) throw error;
}
