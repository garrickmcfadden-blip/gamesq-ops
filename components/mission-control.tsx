'use client';

import { useMemo, useState } from 'react';
import { buildKpis, buildLitigationDeadlines, buildSourceKpis, buildWarnings, matterTiming } from '@/lib/kpi';
import { KPIThresholds } from '@/lib/settings';
import { SaveStatusBanner } from '@/components/save-status';
import { useMissionControl } from '@/lib/store';
import { ActivityItem, Contact, Matter, Stage } from '@/lib/types';

function panel(title: string, subtitle?: string) {
  return { title, subtitle };
}

const panels = {
  triage: panel('Triage Queue', 'What is late, fragile, or stuck'),
  today: panel('Today', 'Time-bound commitments and Garrick-only work'),
  pipeline: panel('Case Flow', 'Volume, drift, and stage pressure'),
  waiting: panel('Waiting On', 'External dependencies and chase cadence'),
  money: panel('Money Radar', 'Near-term fee opportunities and movement'),
  feed: panel('Command Feed', 'Operational updates across the firm'),
  detail: panel('Matter Workspace', 'Selected matter, next move, blockers, notes, and live task controls'),
};

const stageOrder: Stage[] = ['Intake', 'Treatment', 'Demand', 'Litigation', 'Resolution'];

type DirectorySort = 'priority' | 'statute' | 'client' | 'value';

function severityClasses(severity: string) {
  if (severity === 'critical') return 'border-gam-orange/60 bg-gam-orange/10 text-gam-blue';
  if (severity === 'high') return 'border-gam-peach/70 bg-gam-peach/20 text-gam-blue';
  if (severity === 'medium') return 'border-gam-blue/15 bg-gam-sky/55 text-gam-blue';
  return 'border-gam-blue/10 bg-white/75 text-gam-blue';
}

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-gam-blue/10 bg-white/80 p-5 shadow-glow backdrop-blur ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-gam-blue">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-gam-blue/60">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function formatDateDisplay(value?: string) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const clean = value.slice(0, 10);
    const [year, month, day] = clean.split('-');
    return `${Number(month)}/${Number(day)}/${year}`;
  }
  return value;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function taskUrgencyWeight(due: string) {
  if (/overdue/i.test(due)) return 100;
  if (/today/i.test(due)) return 90;
  const parsed = parseDateLike(due);
  if (parsed) {
    const now = new Date();
    const diff = Math.ceil((parsed.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
    if (diff < 0) return 100;
    if (diff === 0) return 90;
    if (diff <= 3) return 80;
    if (diff <= 7) return 60;
    return 20;
  }
  const match = due.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return 10;
  const [, mm, dd, yyyy] = match;
  const target = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  const now = new Date();
  const diff = Math.ceil((target.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
  if (diff < 0) return 100;
  if (diff === 0) return 90;
  if (diff <= 3) return 80;
  if (diff <= 7) return 60;
  return 20;
}

function formatTaskDue(value: string) {
  if (!value || value === 'No due date') return value || 'No due date';
  const parsed = parseDateLike(value);
  if (!parsed) return value;
  return parsed.toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function dateTimeFormParts(value?: string) {
  const parsed = parseDateLike(value);
  if (!parsed) return { date: new Date().toISOString().slice(0, 10), time: '' };
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: `${hour}:${minute}` };
}

function parseDateLike(value?: string) {
  if (!value) return null;
  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) return direct;
  const slash = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const [, mm, dd, yyyy] = slash;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  }
  return null;
}

function countWaitingAgeDays(age?: string) {
  if (!age) return 0;
  const match = age.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function parseCurrencyAmount(value?: string) {
  if (!value) return 0;
  return Number(value.replace(/[^\d.-]/g, '')) || 0;
}

function formatCompactCurrency(value: number) {
  if (!value) return '$0';
  if (value >= 1000) {
    const compact = value / 1000;
    const rounded = Number.isInteger(compact) ? String(compact) : compact.toFixed(1).replace(/\.0$/, '');
    return `$${rounded}k`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function isImminentStep(next?: string) {
  if (!next) return false;
  return /(today|tomorrow|this week|immediate|imminent|asap|urgent|call|follow up|follow-up|review|finalize|sign|send)/i.test(next);
}

function editEventFormValue(item: { title: string; type: string; startsAt?: string }) {
  const { date, time } = dateTimeFormParts(item.startsAt);
  return { title: item.title, kind: item.type, date, time };
}

export function MissionControl() {
  const { matters, contacts, tasks, waitingOn, events, money, activity, milestones, thresholds, setThresholds, selectedMatterId, setSelectedMatterId, updateMatter, updateMatterMilestone, updateTaskStatus, createTask, createMatter, createContact, createWaitingItem, createActivity, createMoneyItem, createMatterNote, createEvent, deleteTask, deleteEvent, deleteWaitingItem, deleteMoneyItem, deleteMatterNote, updateEvent, updateWaitingItem, updateMoneyItem, saveStatus } = useMissionControl();
  const [activeView, setActiveView] = useState<'mission' | 'directory'>('mission');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | Stage>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Matter['priority']>('all');
  const [directorySort, setDirectorySort] = useState<DirectorySort>('priority');
  const [showNewMatter, setShowNewMatter] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskOwner, setNewTaskOwner] = useState('Garrick');
  const [newTaskDue, setNewTaskDue] = useState(() => new Date().toISOString().slice(0, 10));
  const [newTaskTime, setNewTaskTime] = useState('');
  const [matterForm, setMatterForm] = useState<{ title: string; client: string; stage: Stage; priority: Matter['priority']; status: string; owner: string; nextAction: string; blocker: string; projectedValue: string; incidentDate: string; statute: string; }>({ title: '', client: '', stage: 'Intake', priority: 'medium', status: '', owner: 'Garrick', nextAction: '', blocker: '', projectedValue: '', incidentDate: '', statute: '' });
  const [contactForm, setContactForm] = useState({ name: '', role: 'client' as Contact['role'], phone: '', email: '' });
  const [waitingForm, setWaitingForm] = useState({ subject: '', waitingOn: '', age: '', next: '' });
  const [activityForm, setActivityForm] = useState({ type: 'note' as ActivityItem['type'], summary: '' });
  const [moneyForm, setMoneyForm] = useState({ status: '', amount: '', next: '' });
  const [noteBody, setNoteBody] = useState('');
  const [eventForm, setEventForm] = useState({ title: '', kind: 'Event', date: new Date().toISOString().slice(0, 10), time: '' });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingWaitingId, setEditingWaitingId] = useState<string | null>(null);
  const [editingMoneyId, setEditingMoneyId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);

  const filteredMatters = useMemo(() => matters.filter((matter) => {
    const haystack = `${matter.title} ${matter.client} ${matter.sourceType ?? ''} ${matter.owner}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStage = stageFilter === 'all' || matter.stage === stageFilter;
    const matchesPriority = priorityFilter === 'all' || matter.priority === priorityFilter;
    const matchesArchived = showArchived ? true : !matter.archived;
    return matchesSearch && matchesStage && matchesPriority && matchesArchived;
  }), [matters, priorityFilter, search, showArchived, stageFilter]);

  const directoryMatters = useMemo(() => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return filteredMatters.slice().sort((a, b) => {
      if (directorySort === 'client') return a.client.localeCompare(b.client);
      if (directorySort === 'value') return Number((b.value || '$0').replace(/[$,]/g, '')) - Number((a.value || '$0').replace(/[$,]/g, ''));
      if (directorySort === 'statute') return (a.statute || '9999-12-31').localeCompare(b.statute || '9999-12-31');
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [directorySort, filteredMatters]);

  const summaryStats = useMemo(() => {
    const activeMatters = matters.filter((matter) => !matter.archived);
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const newThisWeek = activeMatters.filter((matter) => {
      const created = parseDateLike(matter.createdAt);
      return created ? created >= weekAgo : false;
    }).length;

    const overdueTasks = tasks.filter((task) => task.status !== 'done' && taskUrgencyWeight(task.due) >= 100);
    const statuteRiskMatters = activeMatters.filter((matter) => {
      const statute = parseDateLike(matter.statute);
      if (!statute) return false;
      const diff = Math.ceil((statute.getTime() - now.getTime()) / 86400000);
      return diff <= 60;
    });

    const urgentMatterIds = new Set<string>();
    activeMatters.forEach((matter) => {
      if (matter.priority === 'critical' || matter.priority === 'high') urgentMatterIds.add(matter.id);
    });
    overdueTasks.forEach((task) => urgentMatterIds.add(task.matterId));
    statuteRiskMatters.forEach((matter) => urgentMatterIds.add(matter.id));

    const needGarrick = activeMatters.filter((matter) => urgentMatterIds.has(matter.id) && /garrick/i.test(matter.owner)).length;

    const waitingCount = waitingOn.length;
    const waitingStale = waitingOn.filter((item) => countWaitingAgeDays(item.age) > 7).length;

    const feesInPipeline = money.reduce((sum, item) => sum + parseCurrencyAmount(item.amount), 0);
    const likelyThirty = money.filter((item) => isImminentStep(item.next)).reduce((sum, item) => sum + parseCurrencyAmount(item.amount), 0);

    return [
      { label: 'Active matters', value: String(activeMatters.length), delta: `${newThisWeek >= 0 ? '+' : ''}${newThisWeek} this week` },
      { label: 'Urgent items', value: String(urgentMatterIds.size), delta: `${needGarrick} need Garrick` },
      { label: 'Waiting on others', value: String(waitingCount), delta: `${waitingStale} stale > 7 days` },
      { label: 'Fees in pipeline', value: formatCompactCurrency(feesInPipeline), delta: `${formatCompactCurrency(likelyThirty)} likely < 30d` },
    ];
  }, [matters, money, tasks, waitingOn]);

  const pipeline = useMemo(() => stageOrder.map((stage) => {
    const inStage = filteredMatters.filter((matter) => matter.stage === stage);
    const stuck = inStage.filter((matter) => Boolean(matter.blocker)).length;
    const stale = inStage.filter((matter) => /today|yesterday/i.test(matter.lastActivity) === false && matter.lastActivity).length;
    return { stage, count: inStage.length, stuck, stale, notes: inStage[0]?.status ?? 'No matters in this stage', matterIds: inStage.map((matter) => matter.id) };
  }), [filteredMatters]);

  const kpis = useMemo(() => buildKpis(filteredMatters, tasks, milestones), [filteredMatters, tasks, milestones]);
  const sourceKpis = useMemo(() => buildSourceKpis(filteredMatters, milestones), [filteredMatters, milestones]);
  const warnings = useMemo(() => buildWarnings(filteredMatters, tasks, milestones, thresholds), [filteredMatters, tasks, milestones, thresholds]);
  const selectedMatter = filteredMatters.find((matter) => matter.id === selectedMatterId) ?? matters.find((matter) => matter.id === selectedMatterId) ?? filteredMatters[0] ?? matters[0];
  const selectedMilestone = milestones.find((m) => m.matterId === selectedMatter?.id);
  const selectedTiming = selectedMatter ? matterTiming(selectedMatter, selectedMilestone) : [];
  const selectedLitigationDeadlines = buildLitigationDeadlines(selectedMilestone);
  const selectedTasks = tasks.filter((task) => task.matterId === selectedMatter?.id);
  const selectedWaiting = waitingOn.filter((item) => item.matterId === selectedMatter?.id);
  const selectedMoney = money.find((item) => item.matterId === selectedMatter?.id);
  const selectedActivity = activity.filter((item) => item.matterId === selectedMatter?.id);
  const selectedContacts = contacts.filter((item) => item.matterId === selectedMatter?.id);

  const triageTasks = useMemo(() => tasks.filter((task) => task.status !== 'done' && filteredMatters.some((matter) => matter.id === task.matterId)).slice().sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const pa = priorityOrder[a.priority];
    const pb = priorityOrder[b.priority];
    const urgency = taskUrgencyWeight(b.due) - taskUrgencyWeight(a.due);
    if (urgency !== 0) return urgency;
    return pb - pa;
  }), [filteredMatters, tasks]);

  const eventBuckets = useMemo(() => {
    const base = events.filter((item) => !selectedMatter || !item.matterId || item.matterId === selectedMatter.id || filteredMatters.some((m) => m.id === item.matterId));
    const now = new Date();
    const today: typeof base = [];
    const upcoming: typeof base = [];
    const undated: typeof base = [];

    for (const event of base) {
      if (!event.startsAt) {
        undated.push(event);
        continue;
      }
      const date = new Date(event.startsAt);
      if (isSameDay(date, now)) today.push(event);
      else if (date.getTime() > now.getTime()) upcoming.push(event);
    }

    return { today, upcoming, undated };
  }, [events, filteredMatters, selectedMatter]);

  function selectMatter(matterId?: string) {
    if (matterId) {
      setSelectedMatterId(matterId);
      setActiveView('mission');
    }
  }

  function submitTask() {
    if (!selectedMatter || !newTaskTitle.trim()) return;
    const due = newTaskTime ? `${newTaskDue}T${newTaskTime}:00` : `${newTaskDue}T09:00:00`;
    createTask({ matterId: selectedMatter.id, title: newTaskTitle.trim(), owner: newTaskOwner, due, priority: 'medium', status: 'open' });
    setNewTaskTitle('');
    setNewTaskTime('');
  }

  function submitMatter() {
    if (!matterForm.title.trim() || !matterForm.client.trim()) return;
    createMatter(matterForm);
    setMatterForm({ title: '', client: '', stage: 'Intake', priority: 'medium', status: '', owner: 'Garrick', nextAction: '', blocker: '', projectedValue: '', incidentDate: '', statute: '' });
    setShowNewMatter(false);
  }

  function submitEvent() {
    if (!eventForm.title.trim()) return;
    const startsAt = eventForm.time ? `${eventForm.date}T${eventForm.time}:00` : `${eventForm.date}T09:00:00`;
    if (editingEventId) {
      updateEvent(editingEventId, { title: eventForm.title, kind: eventForm.kind, startsAt });
      setEditingEventId(null);
    } else {
      createEvent({ matterId: selectedMatter?.id, title: eventForm.title, kind: eventForm.kind, startsAt });
    }
    setEventForm({ title: '', kind: 'Event', date: new Date().toISOString().slice(0, 10), time: '' });
  }

  function askConfirm(title: string, message: string, action: () => void) {
    setConfirmAction({ title, message, action });
  }

  function runConfirmedAction() {
    const pending = confirmAction;
    setConfirmAction(null);
    pending?.action();
  }

  return (
    <main className="min-h-screen px-6 py-6 lg:px-8">
      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gam-blue/10 bg-gam-night p-6 shadow-glow">
            <p className="text-sm uppercase tracking-[0.28em] text-gam-peach">Confirm Action</p>
            <h2 className="mt-2 text-xl font-semibold text-gam-blue">{confirmAction.title}</h2>
            <p className="mt-3 text-sm text-gam-blue/65">{confirmAction.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="rounded-xl border border-gam-blue/10 bg-white/70 px-4 py-2 text-sm text-gam-blue/70">Cancel</button>
              <button onClick={runConfirmedAction} className="rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100">Delete</button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="mx-auto flex max-w-[1680px] flex-col gap-6">
        <header className="rounded-3xl border border-gam-blue/10 bg-white/85 p-6 shadow-glow backdrop-blur">
          <div className="mb-4 flex flex-wrap gap-3">
            <button onClick={() => setActiveView('mission')} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeView === 'mission' ? 'bg-gam-orange text-white' : 'border border-gam-blue/10 bg-white/70 text-gam-blue/70'}`}>Mission Control</button>
            <button onClick={() => setActiveView('directory')} className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeView === 'directory' ? 'bg-gam-orange text-white' : 'border border-gam-blue/10 bg-white/70 text-gam-blue/70'}`}>All Matters</button>
          </div>
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.32em] text-gam-orange">GAMESQ, PLC</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-gam-blue md:text-4xl">Mission Control</h1>
              <p className="mt-3 max-w-3xl text-sm text-gam-blue/70 md:text-base">Configurable KPI warnings, grouped drilldowns, and matter filtering/search so Mission Control stays useful as the caseload grows.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowNewMatter((v) => !v)} className="rounded-2xl bg-gam-orange px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110">{showNewMatter ? 'Close New Matter' : 'New Matter'}</button>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {summaryStats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-gam-blue/10 bg-gam-sky/45 px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.22em] text-gam-blue/55">{stat.label}</div>
                    <div className="mt-2 text-2xl font-semibold text-gam-blue">{stat.value}</div>
                    <div className="mt-1 text-xs text-gam-orange">{stat.delta}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <Card title="Filters & KPI Thresholds" subtitle="Control what you see and when Mission Control flags risk">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client or matter" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as 'all' | Stage)} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none"><option value="all">all stages</option><option>Intake</option><option>Treatment</option><option>Demand</option><option>Litigation</option><option>Resolution</option></select>
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | Matter['priority'])} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none"><option value="all">all priorities</option><option>critical</option><option>high</option><option>medium</option><option>low</option></select>
            <button onClick={() => setShowArchived((current) => !current)} className={`rounded-xl px-3 py-2 text-sm font-medium transition ${showArchived ? 'bg-white text-gam-night' : 'border border-gam-blue/10 bg-white/70 text-gam-blue/70 hover:border-gam-blue/20 hover:bg-gam-sky/55'}`}>{showArchived ? 'Hide archived matters' : 'Show archived matters'}</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue">Unsigned retainer days<input type="number" value={thresholds.unsignedRetainerDays} onChange={(e) => setThresholds({ ...thresholds, unsignedRetainerDays: Number(e.target.value) || 0 })} className="mt-2 w-full border-0 bg-transparent text-gam-blue outline-none" /></label>
            <label className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue">Records → demand days<input type="number" value={thresholds.recordsToDemandDays} onChange={(e) => setThresholds({ ...thresholds, recordsToDemandDays: Number(e.target.value) || 0 })} className="mt-2 w-full border-0 bg-transparent text-gam-blue outline-none" /></label>
            <label className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue">Demand without offer days<input type="number" value={thresholds.demandWithoutOfferDays} onChange={(e) => setThresholds({ ...thresholds, demandWithoutOfferDays: Number(e.target.value) || 0 })} className="mt-2 w-full border-0 bg-transparent text-gam-blue outline-none" /></label>
            <label className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue">Stale matter days<input type="number" value={thresholds.staleMatterDays} onChange={(e) => setThresholds({ ...thresholds, staleMatterDays: Number(e.target.value) || 0 })} className="mt-2 w-full border-0 bg-transparent text-gam-blue outline-none" /></label>
          </div>
        </Card>

        <SaveStatusBanner status={saveStatus} />

        {showNewMatter ? (
          <Card title="New Matter Intake" subtitle="Create a real matter record in Mission Control" className="border-gam-peach/20">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input value={matterForm.title} onChange={(e) => setMatterForm({ ...matterForm, title: e.target.value })} placeholder="Matter title" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none placeholder:text-gam-blue/35" />
              <input value={matterForm.client} onChange={(e) => setMatterForm({ ...matterForm, client: e.target.value })} placeholder="Client name" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none placeholder:text-gam-blue/35" />
              <select value={matterForm.stage} onChange={(e) => setMatterForm({ ...matterForm, stage: e.target.value as Stage })} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none"><option>Intake</option><option>Treatment</option><option>Demand</option><option>Litigation</option><option>Resolution</option></select>
              <select value={matterForm.priority} onChange={(e) => setMatterForm({ ...matterForm, priority: e.target.value as Matter['priority'] })} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none"><option>critical</option><option>high</option><option>medium</option><option>low</option></select>
              <input value={matterForm.owner} onChange={(e) => setMatterForm({ ...matterForm, owner: e.target.value })} placeholder="Owner" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
              <input value={matterForm.status} onChange={(e) => setMatterForm({ ...matterForm, status: e.target.value })} placeholder="Status" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
              <input value={matterForm.nextAction} onChange={(e) => setMatterForm({ ...matterForm, nextAction: e.target.value })} placeholder="Next action" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
              <input value={matterForm.blocker} onChange={(e) => setMatterForm({ ...matterForm, blocker: e.target.value })} placeholder="Blocker" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
              <input value={matterForm.projectedValue} onChange={(e) => setMatterForm({ ...matterForm, projectedValue: e.target.value })} placeholder="Projected value" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
              <input type="date" value={matterForm.incidentDate} onChange={(e) => setMatterForm({ ...matterForm, incidentDate: e.target.value })} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
              <input type="date" value={matterForm.statute} onChange={(e) => setMatterForm({ ...matterForm, statute: e.target.value })} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
              <button onClick={submitMatter} className="rounded-xl bg-gam-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">Create Matter</button>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-gam-blue/10 bg-gradient-to-br from-white/95 to-gam-sky/65 p-4 shadow-glow">
              <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/55">{kpi.label}</div>
              <div className="mt-2 text-2xl font-semibold text-gam-blue">{kpi.value}</div>
              <div className="mt-2 text-xs text-gam-blue/60">{kpi.detail}</div>
            </div>
          ))}
        </div>

        {activeView === 'directory' ? (
          <Card title="All Matters" subtitle="Directory view for finding the exact file you want, then jumping straight into its workspace">
            <div className="mb-4 flex flex-wrap gap-3">
              <select value={directorySort} onChange={(e) => setDirectorySort(e.target.value as DirectorySort)} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none">
                <option value="priority">sort: priority</option>
                <option value="statute">sort: statute</option>
                <option value="client">sort: client</option>
                <option value="value">sort: value</option>
              </select>
              <div className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue/70">Click any row to open that matter in Mission Control.</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Matter</th>
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Priority</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Next Action</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Statute</th>
                    <th className="px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {directoryMatters.map((matter) => (
                    <tr key={matter.id} onClick={() => selectMatter(matter.id)} className="cursor-pointer rounded-2xl border border-gam-blue/10 bg-white/70 transition hover:bg-gam-sky/60">
                      <td className="px-3 py-3 text-sm font-semibold text-gam-blue">{matter.client}</td>
                      <td className="px-3 py-3 text-sm text-gam-blue/80">{matter.title}</td>
                      <td className="px-3 py-3 text-sm text-gam-blue/75">{matter.stage}</td>
                      <td className="px-3 py-3 text-sm text-gam-blue/75">{matter.priority}</td>
                      <td className="px-3 py-3 text-sm text-gam-blue/75">{matter.status}</td>
                      <td className="px-3 py-3 text-sm text-gam-blue/75">{matter.nextAction || '—'}</td>
                      <td className="px-3 py-3 text-sm text-gam-blue/75">{matter.sourceType || '—'}</td>
                      <td className="px-3 py-3 text-sm text-gam-blue/75">{formatDateDisplay(matter.statute)}</td>
                      <td className="px-3 py-3 text-sm font-semibold text-emerald-300">{matter.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!directoryMatters.length ? <div className="py-8 text-center text-sm text-gam-blue/55">No matters match the current filters.</div> : null}
            </div>
          </Card>
        ) : (
        <div className="grid gap-6 xl:grid-cols-[1.05fr,1.25fr,1.05fr]">
          <div className="flex flex-col gap-6">
            <Card title={panels.triage.title} subtitle={panels.triage.subtitle}>
              {warnings.length ? <div className="mb-4 space-y-2">{warnings.slice(0, 4).map((warning, idx) => <button key={`${warning.matterId}-${idx}`} onClick={() => selectMatter(warning.matterId)} className={`w-full rounded-xl border px-3 py-2 text-left ${warning.severity === 'high' ? 'border-red-500/40 bg-red-500/10 text-red-100' : 'border-orange-500/40 bg-orange-500/10 text-orange-100'}`}><div className="text-xs uppercase tracking-[0.18em]">{warning.label}</div><div className="mt-1 text-sm">{warning.detail}</div></button>)}</div> : null}
              <div className="space-y-3">
                {triageTasks.map((task) => {
                  const matter = matters.find((item) => item.id === task.matterId);
                  return (
                    <button key={task.id} onClick={() => selectMatter(task.matterId)} className={`w-full rounded-2xl border p-4 text-left transition hover:scale-[1.01] hover:border-gam-blue/20 ${severityClasses(task.priority)} ${selectedMatterId === task.matterId ? 'ring-1 ring-gam-peach/70' : ''}`}>
                      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{task.title}</p><span className="rounded-full border border-gam-blue/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-gam-blue/70">{task.priority}</span></div>
                      <p className="mt-2 text-sm text-gam-blue/75">{matter?.title}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-gam-blue/60"><span>Owner: {task.owner}</span><span>{formatTaskDue(task.due)}</span></div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card title={panels.today.title} subtitle={panels.today.subtitle}>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-gam-blue/45">Today</div>
                  <div className="space-y-3">{eventBuckets.today.length ? eventBuckets.today.map((item) => <div key={item.id} className="flex items-center gap-2"><button onClick={() => selectMatter(item.matterId)} className="flex flex-1 items-center gap-3 rounded-2xl border border-gam-blue/10 bg-white/70 px-4 py-3 text-left transition hover:border-gam-blue/20 hover:bg-gam-sky/55"><div className="min-w-32 text-sm font-semibold text-gam-peach">{item.time}</div><div className="flex-1"><p className="text-sm text-gam-blue">{item.title}</p><p className="mt-1 text-xs uppercase tracking-[0.22em] text-gam-blue/45">{item.type}</p></div></button><button onClick={() => { setEditingEventId(item.id); setEventForm(editEventFormValue(item)); }} className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-sky-200">Edit</button><button onClick={() => { askConfirm('Delete event?', 'This event will be removed from Mission Control.', () => void deleteEvent(item.id)); }} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-red-200">Delete</button></div>) : <div className="text-sm text-gam-blue/50">No events today.</div>}</div>
                </div>
                <div>
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-gam-blue/45">Upcoming</div>
                  <div className="space-y-3">{eventBuckets.upcoming.length ? eventBuckets.upcoming.slice(0, 8).map((item) => <div key={item.id} className="flex items-center gap-2"><button onClick={() => selectMatter(item.matterId)} className="flex flex-1 items-center gap-3 rounded-2xl border border-gam-blue/10 bg-white/70 px-4 py-3 text-left transition hover:border-gam-blue/20 hover:bg-gam-sky/55"><div className="min-w-32 text-sm font-semibold text-gam-peach">{item.time}</div><div className="flex-1"><p className="text-sm text-gam-blue">{item.title}</p><p className="mt-1 text-xs uppercase tracking-[0.22em] text-gam-blue/45">{item.type}</p></div></button><button onClick={() => { setEditingEventId(item.id); setEventForm(editEventFormValue(item)); }} className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-sky-200">Edit</button><button onClick={() => { askConfirm('Delete event?', 'This event will be removed from Mission Control.', () => void deleteEvent(item.id)); }} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-red-200">Delete</button></div>) : <div className="text-sm text-gam-blue/50">No upcoming events.</div>}</div>
                </div>
                {eventBuckets.undated.length ? <div><div className="mb-2 text-xs uppercase tracking-[0.18em] text-gam-blue/45">Undated</div><div className="space-y-3">{eventBuckets.undated.map((item) => <button key={item.id} onClick={() => selectMatter(item.matterId)} className="flex w-full items-center gap-3 rounded-2xl border border-gam-blue/10 bg-white/70 px-4 py-3 text-left transition hover:border-gam-blue/20 hover:bg-gam-sky/55"><div className="min-w-32 text-sm font-semibold text-gam-peach">{item.time || 'No date'}</div><div className="flex-1"><p className="text-sm text-gam-blue">{item.title}</p><p className="mt-1 text-xs uppercase tracking-[0.22em] text-gam-blue/45">{item.type}</p></div></button>)}</div></div> : null}
              </div>
              <div className="mt-4 rounded-2xl border border-gam-blue/10 bg-white/70 p-4">
                <h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Add Event</h4>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Event title" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
                  <input value={eventForm.kind} onChange={(e) => setEventForm({ ...eventForm, kind: e.target.value })} placeholder="Type" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
                  <input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
                  <input type="time" value={eventForm.time} onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
                </div>
                <div className="mt-3 flex gap-2"><button onClick={submitEvent} className="rounded-xl bg-gam-orange px-4 py-2 text-sm font-semibold text-white">{editingEventId ? 'Save Event' : 'Add Event'}</button>{editingEventId ? <button onClick={() => { setEditingEventId(null); setEventForm({ title: '', kind: 'Event', date: new Date().toISOString().slice(0, 10), time: '' }); }} className="rounded-xl border border-gam-blue/10 bg-white/70 px-4 py-2 text-sm text-gam-blue/70">Cancel</button> : null}</div>
              </div>
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card title={panels.pipeline.title} subtitle={panels.pipeline.subtitle}>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {pipeline.map((stage) => (
                  <button key={stage.stage} onClick={() => selectMatter(stage.matterIds[0])} className="rounded-2xl border border-gam-blue/10 bg-white/[0.04] p-4 text-left transition hover:border-gam-blue/20 hover:bg-gam-sky/60">
                    <div className="flex items-center justify-between"><h3 className="text-base font-semibold text-gam-blue">{stage.stage}</h3><span className="text-2xl font-semibold text-gam-sky">{stage.count}</span></div>
                    <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-gam-blue/50"><span className="rounded-full bg-white/70 px-2 py-1">Stuck {stage.stuck}</span><span className="rounded-full bg-white/70 px-2 py-1">Stale {stage.stale}</span></div>
                    <p className="mt-3 text-sm text-gam-blue/65">{stage.notes}</p>
                  </button>
                ))}
              </div>
            </Card>

            <Card title={panels.detail.title} subtitle={panels.detail.subtitle} className="border-gam-peach/20">
              {selectedMatter ? <div className="space-y-5">
                <div className="rounded-2xl border border-gam-peach/20 bg-gam-orange/5 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-xl font-semibold text-gam-blue">{selectedMatter.title}</h3><p className="mt-1 text-sm text-gam-blue/65">Client: {selectedMatter.client}</p></div><div className="flex flex-col items-end gap-2"><div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${severityClasses(selectedMatter.priority)}`}>{selectedMatter.stage}</div><button onClick={() => updateMatter(selectedMatter.id, { archived: !selectedMatter.archived, archivedAt: selectedMatter.archived ? undefined : new Date().toISOString() })} className={`rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${selectedMatter.archived ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15' : 'border border-gam-peach/30 bg-gam-orange/10 text-gam-peach hover:bg-gam-orange/20'}`}>{selectedMatter.archived ? 'Restore Matter' : 'Archive Matter'}</button></div></div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Stage</div><select value={selectedMatter.stage} onChange={(e) => updateMatter(selectedMatter.id, { stage: e.target.value as Stage })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none"><option>Intake</option><option>Treatment</option><option>Demand</option><option>Litigation</option><option>Resolution</option></select></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Priority</div><select value={selectedMatter.priority} onChange={(e) => updateMatter(selectedMatter.id, { priority: e.target.value as Matter['priority'] })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none"><option>critical</option><option>high</option><option>medium</option><option>low</option></select></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Owner</div><input value={selectedMatter.owner} onChange={(e) => updateMatter(selectedMatter.id, { owner: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Status</div><input value={selectedMatter.status} onChange={(e) => updateMatter(selectedMatter.id, { status: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Next Action</div><input value={selectedMatter.nextAction} onChange={(e) => updateMatter(selectedMatter.id, { nextAction: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Blocker</div><input value={selectedMatter.blocker ?? ''} onChange={(e) => updateMatter(selectedMatter.id, { blocker: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" placeholder="None currently" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Incident Date</div><input type="date" value={selectedMatter.incidentDate || ''} onChange={(e) => updateMatter(selectedMatter.id, { incidentDate: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Statute</div><input type="date" value={selectedMatter.statute || ''} onChange={(e) => updateMatter(selectedMatter.id, { statute: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Projected Value</div><input value={selectedMatter.value.replace(/[$,]/g, '')} onChange={(e) => updateMatter(selectedMatter.id, { value: `$${e.target.value}` })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Source Type</div><input value={selectedMatter.sourceType ?? ''} onChange={(e) => updateMatter(selectedMatter.id, { sourceType: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" placeholder="Referral / YouTube / Search" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Source Detail</div><input value={selectedMatter.sourceDetail ?? ''} onChange={(e) => updateMatter(selectedMatter.id, { sourceDetail: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" placeholder="Former client / Google Maps / etc." /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.2em] text-gam-blue/45">Campaign</div><input value={selectedMatter.campaign ?? ''} onChange={(e) => updateMatter(selectedMatter.id, { campaign: e.target.value })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" placeholder="Campaign or content source" /></label>
                  </div>
                </div>

                <div className="grid gap-5 2xl:grid-cols-[1.05fr,0.95fr]">
                  <div className="space-y-5">
                    <div><h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Open Tasks</h4><div className="mt-3 space-y-3">{selectedTasks.length ? selectedTasks.map((task) => <div key={task.id} className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-gam-blue">{task.title}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-gam-blue/45">{task.owner} • {formatTaskDue(task.due)}</p></div><div className="flex gap-2">{task.status !== 'done' ? <button onClick={() => updateTaskStatus(task.id, 'done')} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-300">Done</button> : null}{task.status === 'open' ? <button onClick={() => updateTaskStatus(task.id, 'in_progress')} className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-sky-200">Start</button> : null}<button onClick={() => { askConfirm('Delete task?', 'This task will be removed from the selected matter.', () => void deleteTask(task.id)); }} className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-red-200">Delete</button></div></div></div>) : <p className="text-sm text-gam-blue/55">No tasks attached to this matter yet.</p>}</div></div>
                    <div className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4"><h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Quick Add Task</h4><div className="mt-3 grid gap-3 md:grid-cols-[1.2fr,0.8fr,0.9fr,0.8fr,auto]"><input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Task title" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none placeholder:text-gam-blue/35" /><input value={newTaskOwner} onChange={(e) => setNewTaskOwner(e.target.value)} placeholder="Owner" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none placeholder:text-gam-blue/35" /><input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /><input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /><button onClick={submitTask} className="rounded-xl bg-gam-orange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110">Add</button></div></div>
                    <div className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4"><h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Add Contact</h4><div className="mt-3 grid gap-3 md:grid-cols-2"><input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Name" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /><select value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value as Contact['role'] })} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none"><option value="client">client</option><option value="adjuster">adjuster</option><option value="provider">provider</option><option value="defense_counsel">defense counsel</option><option value="court">court</option><option value="witness">witness</option><option value="other">other</option></select><input value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} placeholder="Phone" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /><input value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} placeholder="Email" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /></div><button onClick={() => { if (selectedMatter && contactForm.name.trim()) { createContact({ matterId: selectedMatter.id, ...contactForm }); setContactForm({ name: '', role: 'client', phone: '', email: '' }); }}} className="mt-3 rounded-xl bg-gam-orange px-4 py-2 text-sm font-semibold text-white">Add Contact</button></div>
                  </div>

                  <div className="space-y-5">
                    <div><h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Waiting On</h4><div className="mt-3 space-y-3">{selectedWaiting.length ? selectedWaiting.map((item) => <div key={item.id} className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-gam-blue">{item.subject}</p><p className="mt-1 text-sm text-gam-blue/65">Waiting on {item.waitingOn}</p><p className="mt-3 text-xs uppercase tracking-[0.18em] text-gam-blue/45">Age {item.age} • Next {item.next}</p></div><div className="flex gap-2"><button onClick={() => { setEditingWaitingId(item.id); setWaitingForm({ subject: item.subject, waitingOn: item.waitingOn, age: item.age, next: item.next }); }} className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-sky-200">Edit</button><button onClick={() => { askConfirm('Delete waiting item?', 'This waiting item will be removed from the selected matter.', () => void deleteWaitingItem(item.id)); }} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-red-200">Delete</button></div></div></div>) : <p className="text-sm text-gam-blue/55">Nothing outstanding.</p>}</div></div>
                    <div className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4"><h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">{editingWaitingId ? 'Edit Waiting Item' : 'Add Waiting Item'}</h4><div className="mt-3 grid gap-3 md:grid-cols-2"><input value={waitingForm.subject} onChange={(e) => setWaitingForm({ ...waitingForm, subject: e.target.value })} placeholder="Subject" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /><input value={waitingForm.waitingOn} onChange={(e) => setWaitingForm({ ...waitingForm, waitingOn: e.target.value })} placeholder="Waiting on" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /><input value={waitingForm.age} onChange={(e) => setWaitingForm({ ...waitingForm, age: e.target.value })} placeholder="Age label" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /><input value={waitingForm.next} onChange={(e) => setWaitingForm({ ...waitingForm, next: e.target.value })} placeholder="Next step" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /></div><div className="mt-3 flex gap-2"><button onClick={() => { if (selectedMatter && waitingForm.subject.trim()) { if (editingWaitingId) { updateWaitingItem(editingWaitingId, waitingForm); setEditingWaitingId(null); } else { createWaitingItem({ matterId: selectedMatter.id, ...waitingForm }); } setWaitingForm({ subject: '', waitingOn: '', age: '', next: '' }); }}} className="rounded-xl bg-gam-orange px-4 py-2 text-sm font-semibold text-white">{editingWaitingId ? 'Save Waiting Item' : 'Add Waiting Item'}</button>{editingWaitingId ? <button onClick={() => { setEditingWaitingId(null); setWaitingForm({ subject: '', waitingOn: '', age: '', next: '' }); }} className="rounded-xl border border-gam-blue/10 bg-white/70 px-4 py-2 text-sm text-gam-blue/70">Cancel</button> : null}</div></div>
                    <div className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4"><h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Add Matter Note</h4><textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Matter note" className="mt-3 min-h-24 w-full rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" /><button onClick={() => { if (selectedMatter && noteBody.trim()) { createMatterNote({ matterId: selectedMatter.id, body: noteBody.trim() }); setNoteBody(''); }}} className="mt-3 rounded-xl bg-gam-orange px-4 py-2 text-sm font-semibold text-white">Add Note</button></div>
                    <div><h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Contacts</h4><div className="mt-3 space-y-3">{selectedContacts.map((contact) => <div key={contact.id} className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4"><p className="text-sm font-semibold text-gam-blue">{contact.name}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] text-gam-blue/45">{contact.role.replace('_', ' ')}</p>{(contact.phone || contact.email) ? <p className="mt-2 text-sm text-gam-blue/65">{contact.phone ?? contact.email}</p> : null}</div>)}</div></div>
                    <div><h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Matter Notes</h4><div className="mt-3 space-y-3">{selectedMatter.notes.map((note) => <div key={note.id} className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4 text-sm text-gam-blue/80"><div className="flex items-start justify-between gap-3"><div>{note.body}</div><button onClick={() => { askConfirm('Delete note?', 'This note will be permanently removed from the selected matter.', () => void deleteMatterNote(note.id)); }} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-red-200">Delete</button></div></div>)}</div></div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3 text-xs uppercase tracking-[0.18em] text-gam-blue/45">
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">Incident: <span className="text-gam-blue/75">{formatDateDisplay(selectedMatter.incidentDate)}</span></div>
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">Statute: <span className="text-gam-blue/75">{formatDateDisplay(selectedMatter.statute)}</span></div>
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">Last activity: <span className="text-gam-blue/75 normal-case tracking-normal">{selectedMatter.lastActivity}</span></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {selectedTiming.map((item) => (
                    <div key={item.label} className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">
                      <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">{item.label}</div>
                      <div className="mt-2 text-lg font-semibold text-gam-blue">{item.display}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-gam-blue/10 bg-white/70 p-4">
                  <h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Matter Milestones</h4>
                  <h5 className="mt-4 text-xs uppercase tracking-[0.2em] text-gam-sky/70">Intake / Demand</h5>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Lead Created</div><input type="date" value={selectedMilestone?.leadCreatedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { leadCreatedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Letter of Rep Sent</div><input type="date" value={selectedMilestone?.letterOfRepSentAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { letterOfRepSentAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">2-Week Adjuster Notice</div><input type="date" value={selectedMilestone?.adjusterNotice2WeekAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { adjusterNotice2WeekAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">30-Day Adjuster Notice</div><input type="date" value={selectedMilestone?.adjusterNotice30DayAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { adjusterNotice30DayAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">60-Day Adjuster Notice</div><input type="date" value={selectedMilestone?.adjusterNotice60DayAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { adjusterNotice60DayAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">90-Day Adjuster Notice</div><input type="date" value={selectedMilestone?.adjusterNotice90DayAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { adjusterNotice90DayAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Retainer Sent</div><input type="date" value={selectedMilestone?.retainerSentAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { retainerSentAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Retainer Signed</div><input type="date" value={selectedMilestone?.retainerSignedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { retainerSignedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Records Ordered</div><input type="date" value={selectedMilestone?.recordsFirstOrderedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { recordsFirstOrderedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Records Received</div><input type="date" value={selectedMilestone?.recordsReceivedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { recordsReceivedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Demand Sent</div><input type="date" value={selectedMilestone?.demandSentAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { demandSentAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">First Offer</div><input type="date" value={selectedMilestone?.firstOfferAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { firstOfferAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                  </div>
                  <h5 className="mt-5 text-xs uppercase tracking-[0.2em] text-gam-sky/70">Litigation</h5>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Complaint Filed</div><input type="date" value={selectedMilestone?.complaintFiledAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { complaintFiledAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Service Completed</div><input type="date" value={selectedMilestone?.serviceCompletedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { serviceCompletedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Defendant Answer Received</div><input type="date" value={selectedMilestone?.defendantAnswerReceivedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { defendantAnswerReceivedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Disclosure Statement Sent</div><input type="date" value={selectedMilestone?.disclosureStatementSentAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { disclosureStatementSentAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">First Discovery Sent</div><input type="date" value={selectedMilestone?.firstDiscoverySentAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { firstDiscoverySentAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Discovery Responses Due</div><input type="date" value={selectedMilestone?.discoveryResponsesDueAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { discoveryResponsesDueAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Depositions Completed</div><input type="date" value={selectedMilestone?.depositionsCompletedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { depositionsCompletedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Mediation Scheduled</div><input type="date" value={selectedMilestone?.mediationScheduledAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { mediationScheduledAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Mediation Completed</div><input type="date" value={selectedMilestone?.mediationCompletedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { mediationCompletedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Trial Date</div><input type="date" value={selectedMilestone?.trialDate?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { trialDate: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                  </div>
                  <div className="mt-5 rounded-2xl border border-gam-blue/10 bg-gam-sky/35 p-4">
                    <h5 className="text-xs uppercase tracking-[0.2em] text-gam-blue/60">Deadline Engine</h5>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      {selectedLitigationDeadlines.map((deadline) => (
                        <div key={deadline.label} className={`rounded-xl border p-3 ${deadline.status === 'overdue' ? 'border-gam-orange/60 bg-gam-orange/10' : deadline.status === 'soon' ? 'border-gam-peach/70 bg-gam-peach/20' : deadline.status === 'complete' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-gam-blue/10 bg-white/75'}`}>
                          <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">{deadline.label}</div>
                          <div className="mt-2 text-sm font-semibold text-gam-blue">{formatDateDisplay(deadline.due)}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gam-orange">{deadline.status}</div>
                          <div className="mt-2 text-xs text-gam-blue/60">{deadline.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <h5 className="mt-5 text-xs uppercase tracking-[0.2em] text-gam-sky/70">Settlement / Disbursement</h5>
                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Settlement Reached</div><input type="date" value={selectedMilestone?.settlementReachedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { settlementReachedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Settlement Paperwork Received</div><input type="date" value={selectedMilestone?.settlementPaperworkReceivedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { settlementPaperworkReceivedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Settlement Paperwork Sent Back</div><input type="date" value={selectedMilestone?.settlementPaperworkSentAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { settlementPaperworkSentAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Settlement Check Received</div><input type="date" value={selectedMilestone?.settlementCheckReceivedAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { settlementCheckReceivedAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                    <label className="rounded-xl bg-white/70 p-3"><div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Client Check Sent</div><input type="date" value={selectedMilestone?.clientCheckSentAt?.slice(0, 10) ?? ''} onChange={(e) => updateMatterMilestone(selectedMatter.id, { clientCheckSentAt: e.target.value || undefined })} className="mt-2 w-full border-0 bg-transparent text-sm text-gam-blue outline-none" /></label>
                  </div>
                </div>
              </div> : null}
            </Card>
          </div>

          <div className="flex flex-col gap-6">
            <Card title={panels.waiting.title} subtitle={panels.waiting.subtitle}>
              <div className="space-y-3">
                {waitingOn
                  .filter((item) => filteredMatters.some((matter) => matter.id === item.matterId))
                  .map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectMatter(item.matterId)}
                      className="w-full rounded-2xl border border-gam-blue/10 bg-white/70 p-4 text-left transition hover:border-gam-blue/20 hover:bg-gam-sky/55"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gam-blue">{item.subject}</p>
                        <span className="text-xs uppercase tracking-[0.18em] text-gam-peach">{item.age}</span>
                      </div>
                      <p className="mt-2 text-sm text-gam-blue/65">{matters.find((matter) => matter.id === item.matterId)?.title}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gam-blue/45">Next: {item.next}</p>
                    </button>
                  ))}
              </div>
            </Card>

            <Card title={panels.money.title} subtitle={panels.money.subtitle}>
              <div className="space-y-3">
                {money
                  .filter((row) => filteredMatters.some((matter) => matter.id === row.matterId))
                  .map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <button
                        onClick={() => selectMatter(row.matterId)}
                        className="flex-1 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-left transition hover:border-emerald-300/40 hover:bg-emerald-400/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gam-blue">{matters.find((matter) => matter.id === row.matterId)?.title}</p>
                          <span className="text-sm font-semibold text-emerald-300">{row.amount}</span>
                        </div>
                        <p className="mt-2 text-sm text-gam-blue/65">{row.status}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-gam-blue/45">Next: {row.next}</p>
                      </button>
                      <button
                        onClick={() => {
                          setEditingMoneyId(row.id);
                          setMoneyForm({ status: row.status, amount: row.amount.replace(/[$,]/g, ''), next: row.next });
                        }}
                        className="rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-sky-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          askConfirm('Delete money item?', 'This money item will be removed from Money Radar.', () => void deleteMoneyItem(row.id));
                        }}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
              </div>

              <div className="mt-4 rounded-2xl border border-gam-blue/10 bg-white/70 p-4">
                <h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Source Performance</h4>
                <div className="mt-3 space-y-3">
                  {sourceKpis.length ? (
                    sourceKpis.map((source) => (
                      <div key={source.source} className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-gam-blue">{source.source}</div>
                          <div className="text-sm font-semibold text-emerald-300">${source.pipelineValue.toLocaleString()}</div>
                        </div>
                        <div className="mt-2 text-xs text-gam-blue/60">
                          {source.matterCount} matters • Lead→Sign {source.avgLeadToSign !== null ? `${source.avgLeadToSign}d` : '—'} • File Age {source.avgFileAge !== null ? `${source.avgFileAge}d` : '—'}
                        </div>
                        <div className="mt-1 text-xs text-gam-blue/45">
                          Records→Demand {source.avgRecordsToDemand !== null ? `${source.avgRecordsToDemand}d` : '—'} • Demand→Offer {source.avgDemandToOffer !== null ? `${source.avgDemandToOffer}d` : '—'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gam-blue/55">No source data yet.</div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-gam-blue/10 bg-white/70 p-4">
                <h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">{editingMoneyId ? 'Edit Money Item' : 'Add Money Item'}</h4>
                <div className="mt-3 grid gap-3">
                  <input value={moneyForm.status} onChange={(e) => setMoneyForm({ ...moneyForm, status: e.target.value })} placeholder="Status" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
                  <input value={moneyForm.amount} onChange={(e) => setMoneyForm({ ...moneyForm, amount: e.target.value })} placeholder="Amount" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
                  <input value={moneyForm.next} onChange={(e) => setMoneyForm({ ...moneyForm, next: e.target.value })} placeholder="Next step" className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedMatter && moneyForm.status.trim()) {
                        if (editingMoneyId) {
                          updateMoneyItem(editingMoneyId, moneyForm);
                          setEditingMoneyId(null);
                        } else {
                          createMoneyItem({ matterId: selectedMatter.id, ...moneyForm });
                        }
                        setMoneyForm({ status: '', amount: '', next: '' });
                      }
                    }}
                    className="rounded-xl bg-gam-orange px-4 py-2 text-sm font-semibold text-white"
                  >
                    {editingMoneyId ? 'Save Money Item' : 'Add Money Item'}
                  </button>
                  {editingMoneyId ? (
                    <button
                      onClick={() => {
                        setEditingMoneyId(null);
                        setMoneyForm({ status: '', amount: '', next: '' });
                      }}
                      className="rounded-xl border border-gam-blue/10 bg-white/70 px-4 py-2 text-sm text-gam-blue/70"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card title={panels.feed.title} subtitle={panels.feed.subtitle}>
              <div className="space-y-3">
                {selectedActivity.map((item, index) => (
                  <div key={item.id} className="flex gap-3 rounded-2xl border border-gam-blue/10 bg-white/70 px-4 py-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-gam-orange/15 text-xs font-semibold text-gam-peach">{index + 1}</div>
                    <div>
                      <p className="text-sm text-gam-blue/80">{item.summary}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gam-blue/45">{item.type} • {item.createdAt}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-gam-blue/10 bg-white/70 p-4">
                <h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">KPI Drilldown</h4>
                <div className="mt-3 grid gap-3">
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Intake Velocity</div>
                    <div className="mt-2 text-lg font-semibold text-gam-blue">{kpis[0]?.value ?? '—'} / {kpis[1]?.value ?? '—'}</div>
                    <div className="mt-1 text-xs text-gam-blue/55">Lead to sign and retainer to sign.</div>
                  </div>
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Demand Velocity</div>
                    <div className="mt-2 text-lg font-semibold text-gam-blue">{kpis[3]?.value ?? '—'} / {kpis[4]?.value ?? '—'}</div>
                    <div className="mt-1 text-xs text-gam-blue/55">Records to demand and demand to offer.</div>
                  </div>
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Resolution Velocity</div>
                    <div className="mt-2 text-lg font-semibold text-gam-blue">{kpis[5]?.value ?? '—'}</div>
                    <div className="mt-1 text-xs text-gam-blue/55">Demand to settlement cycle time.</div>
                  </div>
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Disclosure Velocity</div>
                    <div className="mt-2 text-lg font-semibold text-gam-blue">{kpis[6]?.value ?? '—'} / {kpis[7]?.value ?? '—'}</div>
                    <div className="mt-1 text-xs text-gam-blue/55">Answer to Disclosure Statement and Answer to first discovery sent.</div>
                  </div>
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Settlement Disbursement</div>
                    <div className="mt-2 text-lg font-semibold text-gam-blue">{kpis[8]?.value ?? '—'} / {kpis[9]?.value ?? '—'} / {kpis[10]?.value ?? '—'}</div>
                    <div className="mt-1 text-xs text-gam-blue/55">Docs received to returned, check received to client check, and settlement to client check.</div>
                  </div>
                  <div className="rounded-xl border border-gam-blue/10 bg-white/70 p-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-gam-blue/45">Risk & Drift</div>
                    <div className="mt-2 text-lg font-semibold text-gam-blue">{kpis[11]?.value ?? '—'} stale / {kpis[13]?.value ?? '—'} risk</div>
                    <div className="mt-1 text-xs text-gam-blue/55">Stale matters and statute risk.</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-gam-blue/10 bg-white/70 p-4">
                <h4 className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Add Activity</h4>
                <div className="mt-3 grid gap-3">
                  <select value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value as ActivityItem['type'] })} className="rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none">
                    <option value="note">note</option>
                    <option value="call">call</option>
                    <option value="email">email</option>
                    <option value="deadline">deadline</option>
                    <option value="demand">demand</option>
                    <option value="filing">filing</option>
                    <option value="settlement">settlement</option>
                  </select>
                  <textarea value={activityForm.summary} onChange={(e) => setActivityForm({ ...activityForm, summary: e.target.value })} placeholder="Summary" className="min-h-24 rounded-xl border border-gam-blue/10 bg-white/70 px-3 py-2 text-sm text-gam-blue outline-none" />
                </div>
                <button
                  onClick={() => {
                    if (selectedMatter && activityForm.summary.trim()) {
                      createActivity({ matterId: selectedMatter.id, ...activityForm });
                      setActivityForm({ type: 'note', summary: '' });
                    }
                  }}
                  className="mt-3 rounded-xl bg-gam-orange px-4 py-2 text-sm font-semibold text-white"
                >
                  Add Activity
                </button>
              </div>

              {selectedMoney ? (
                <div className="mt-5 rounded-2xl border border-gam-peach/20 bg-gam-orange/5 p-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-gam-blue/45">Selected matter finance</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gam-blue">{selectedMatter?.title}</p>
                      <p className="mt-1 text-sm text-gam-blue/65">{selectedMoney.status}</p>
                    </div>
                    <div className="text-lg font-semibold text-emerald-300">{selectedMoney.amount}</div>
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        </div>
        )}
      </div>
    </main>
  );
}
