import { activity, contacts, matters, money, tasks, waitingOn, today } from '@/lib/data';
import { supabase } from '@/lib/supabase';

export async function seedSupabase() {
  const matterInsert = matters.map((matter) => ({
    id: matter.id,
    title: matter.title,
    client_name: matter.client,
    stage: matter.stage,
    priority: matter.priority,
    status: matter.status,
    owner: matter.owner,
    last_activity: matter.lastActivity,
    next_action: matter.nextAction,
    blocker: matter.blocker ?? null,
    projected_value: Number(matter.value.replace(/[$,]/g, '')),
    incident_date: matter.incidentDate || null,
    statute_date: matter.statute || null,
  }));

  await supabase.from('matters').upsert(matterInsert);
  await supabase.from('contacts').upsert(contacts.map((contact) => ({ id: contact.id, matter_id: contact.matterId ?? null, name: contact.name, role: contact.role, phone: contact.phone ?? null, email: contact.email ?? null })));
  await supabase.from('tasks').upsert(tasks.map((task) => ({ id: task.id, matter_id: task.matterId, title: task.title, owner: task.owner, due_at: task.due, priority: task.priority, status: task.status })));
  await supabase.from('waiting_items').upsert(waitingOn.map((item) => ({ id: item.id, matter_id: item.matterId, subject: item.subject, waiting_on: item.waitingOn, age_label: item.age, next_step: item.next })));
  await supabase.from('events').upsert(today.map((item) => ({ id: item.id, matter_id: item.matterId ?? null, starts_at: null, title: item.title, kind: item.type })));
  await supabase.from('money_items').upsert(money.map((item) => ({ id: item.id, matter_id: item.matterId, status: item.status, amount: Number(item.amount.replace(/[$,]/g, '')), next_step: item.next })));
  await supabase.from('activity_log').upsert(activity.map((item) => ({ id: item.id, matter_id: item.matterId, activity_type: item.type, summary: item.summary })));
  await supabase.from('matter_notes').upsert(matters.flatMap((matter) => matter.notes.map((body, index) => ({ id: `${matter.id}-note-${index}`, matter_id: matter.id, body }))));
}
