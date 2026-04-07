'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAppSettings, createActivityRecord, createContactRecord, createEventRecord, createMatterNoteRecord, createMatterRecord, createMoneyItemRecord, createTaskRecord, createWaitingItemRecord, deleteEventRecord, deleteMatterNoteRecord, deleteMoneyItemRecord, deleteTaskRecord, deleteWaitingItemRecord, fetchActivity, fetchContacts, fetchEvents, fetchMatterMilestones, fetchMatters, fetchMoneyItems, fetchTasks, fetchWaitingItems, updateEventRecord, updateMatterRecord, updateMoneyItemRecord, updateTaskRecord, updateWaitingItemRecord, upsertAppSetting, upsertMatterMilestoneRecord } from '@/lib/db';
import { defaultThresholds, KPIThresholds } from '@/lib/settings';
import { ActivityItem, Contact, EventItem, Matter, MatterMilestone, MoneyItem, Task, TaskStatus, WaitingItem } from '@/lib/types';
import type { SaveStatus } from '@/components/save-status';

interface MissionControlContextValue {
  matters: Matter[];
  contacts: Contact[];
  tasks: Task[];
  waitingOn: WaitingItem[];
  events: EventItem[];
  money: MoneyItem[];
  activity: ActivityItem[];
  milestones: MatterMilestone[];
  thresholds: KPIThresholds;
  setThresholds: (thresholds: KPIThresholds) => void;
  selectedMatterId: string;
  setSelectedMatterId: (matterId: string) => void;
  updateMatter: (matterId: string, updates: Partial<Matter>) => Promise<void>;
  updateMatterMilestone: (matterId: string, updates: Partial<MatterMilestone>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  createTask: (task: Omit<Task, 'id'>) => Promise<void>;
  createMatter: (input: {
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
  }) => Promise<void>;
  createContact: (input: { matterId: string; name: string; role: Contact['role']; phone?: string; email?: string }) => Promise<void>;
  createWaitingItem: (input: { matterId: string; subject: string; waitingOn: string; age?: string; next?: string }) => Promise<void>;
  createActivity: (input: { matterId: string; type: ActivityItem['type']; summary: string }) => Promise<void>;
  createMoneyItem: (input: { matterId: string; status: string; amount?: string; next?: string }) => Promise<void>;
  createMatterNote: (input: { matterId: string; body: string }) => Promise<void>;
  createEvent: (input: { matterId?: string; title: string; kind: string; startsAt?: string }) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  deleteWaitingItem: (waitingItemId: string) => Promise<void>;
  deleteMoneyItem: (moneyItemId: string) => Promise<void>;
  deleteMatterNote: (matterId: string, body: string) => Promise<void>;
  updateEvent: (eventId: string, input: { title: string; kind: string; startsAt?: string }) => Promise<void>;
  updateWaitingItem: (waitingItemId: string, input: { subject: string; waitingOn: string; age?: string; next?: string }) => Promise<void>;
  updateMoneyItem: (moneyItemId: string, input: { status: string; amount?: string; next?: string }) => Promise<void>;
  hydrated: boolean;
  saveStatus: SaveStatus;
}

const MissionControlContext = createContext<MissionControlContextValue | null>(null);

function formatCurrency(value?: string) {
  return value ? `$${value}` : '$0';
}

function formatEventTime(startsAt?: string) {
  if (!startsAt) return '';
  return new Date(startsAt).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function sortEventsByStart(events: EventItem[]) {
  return events.slice().sort((a, b) => {
    const av = a.startsAt ? new Date(a.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bv = b.startsAt ? new Date(b.startsAt).getTime() : Number.MAX_SAFE_INTEGER;
    return av - bv;
  });
}

export function MissionControlProvider({ children }: { children: React.ReactNode }) {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [waitingOn, setWaitingOn] = useState<WaitingItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [money, setMoney] = useState<MoneyItem[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [milestones, setMilestones] = useState<MatterMilestone[]>([]);
  const [thresholds, setThresholdsState] = useState<KPIThresholds>(defaultThresholds);
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ type: 'idle' });

  function pulseStatus(status: SaveStatus) {
    setSaveStatus(status);
    if (status.type === 'success' || status.type === 'error') {
      window.setTimeout(() => setSaveStatus({ type: 'idle' }), 2500);
    }
  }

  useEffect(() => {
    let active = true;
    async function hydrate() {
      try {
        const [mattersData, contactsData, tasksData, waitingData, eventsData, moneyData, activityData, milestoneData, appSettings] = await Promise.all([
          fetchMatters(), fetchContacts(), fetchTasks(), fetchWaitingItems(), fetchEvents(), fetchMoneyItems(), fetchActivity(), fetchMatterMilestones(), fetchAppSettings(),
        ]);
        if (!active) return;
        setMatters(mattersData);
        setSelectedMatterId((current) => {
          if (current && mattersData.some((matter) => matter.id === current)) return current;
          return mattersData[0]?.id ?? '';
        });
        setContacts(contactsData);
        setTasks(tasksData);
        setWaitingOn(waitingData);
        setEvents(sortEventsByStart(eventsData));
        setMoney(moneyData);
        setActivity(activityData);
        setMilestones(milestoneData);
        const thresholdSetting = appSettings.find((row: { key: string; value: KPIThresholds }) => row.key === 'kpi_thresholds');
        if (thresholdSetting?.value) setThresholdsState({ ...defaultThresholds, ...thresholdSetting.value });
      } catch {
      } finally {
        if (active) setHydrated(true);
      }
    }
    hydrate();
    return () => { active = false; };
  }, []);

  function setThresholds(thresholds: KPIThresholds) {
    setThresholdsState(thresholds);
    pulseStatus({ type: 'saving', message: 'Saving threshold settings…' });
    void upsertAppSetting('kpi_thresholds', thresholds)
      .then(() => pulseStatus({ type: 'success', message: 'Threshold settings saved.' }))
      .catch(() => pulseStatus({ type: 'error', message: 'Threshold settings failed to save.' }));
  }

  const value = useMemo<MissionControlContextValue>(() => ({
    matters, contacts, tasks, waitingOn, events, money, activity, milestones, thresholds, setThresholds, selectedMatterId, setSelectedMatterId, hydrated, saveStatus,
    updateMatter: async (matterId, updates) => {
      setMatters((current) => current.map((matter) => (matter.id === matterId ? { ...matter, ...updates } : matter)));
      pulseStatus({ type: 'saving', message: 'Saving matter changes…' });
      try {
        await updateMatterRecord(matterId, updates);
        pulseStatus({ type: 'success', message: 'Matter changes saved.' });
      } catch {
        pulseStatus({ type: 'error', message: 'Matter changes failed to save.' });
      }
    },
    updateMatterMilestone: async (matterId, updates) => {
      setMilestones((current) => {
        const existing = current.find((m) => m.matterId === matterId);
        if (existing) return current.map((m) => m.matterId === matterId ? { ...m, ...updates } : m);
        return [...current, { matterId, ...updates }];
      });
      pulseStatus({ type: 'saving', message: 'Saving milestone…' });
      try {
        await upsertMatterMilestoneRecord(matterId, updates);
        pulseStatus({ type: 'success', message: 'Milestone saved.' });
      } catch {
        pulseStatus({ type: 'error', message: 'Milestone failed to save.' });
      }
    },
    updateTaskStatus: async (taskId, status) => {
      setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
      pulseStatus({ type: 'saving', message: 'Saving task status…' });
      try {
        await updateTaskRecord(taskId, status);
        pulseStatus({ type: 'success', message: 'Task status saved.' });
      } catch {
        pulseStatus({ type: 'error', message: 'Task status failed to save.' });
      }
    },
    createTask: async (task) => {
      const optimisticTask = { ...task, id: `task-${crypto.randomUUID()}` };
      setTasks((current) => [optimisticTask, ...current]);
      pulseStatus({ type: 'saving', message: 'Saving task…' });
      try {
        await createTaskRecord(task);
        pulseStatus({ type: 'success', message: 'Task saved.' });
      } catch {
        pulseStatus({ type: 'error', message: 'Task failed to save.' });
      }
    },
    createMatter: async (input) => {
      const optimisticId = `matter-${crypto.randomUUID()}`;
      const optimisticMatter: Matter = {
        id: optimisticId, title: input.title, client: input.client, stage: input.stage, priority: input.priority, status: input.status,
        owner: input.owner, lastActivity: 'Matter created in Mission Control', nextAction: input.nextAction, blocker: input.blocker,
        value: formatCurrency(input.projectedValue), incidentDate: input.incidentDate || '', statute: input.statute || '', sourceType: undefined, sourceDetail: undefined, campaign: undefined, archived: false, archivedAt: undefined, createdAt: new Date().toISOString(), notes: [],
      };
      setMatters((current) => [optimisticMatter, ...current]);
      setSelectedMatterId(optimisticId);
      pulseStatus({ type: 'saving', message: 'Creating matter…' });
      try {
        const data = await createMatterRecord(input);
        setMatters((current) => current.map((m) => m.id === optimisticId ? { ...m, id: data.id, value: data.projected_value ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(data.projected_value) : '$0' } : m));
        setSelectedMatterId(data.id);
        pulseStatus({ type: 'success', message: 'Matter created.' });
      } catch {
        pulseStatus({ type: 'error', message: 'Matter failed to create.' });
      }
    },
    createContact: async (input) => {
      const optimistic: Contact = { id: `contact-${crypto.randomUUID()}`, ...input };
      setContacts((current) => [optimistic, ...current]);
      pulseStatus({ type: 'saving', message: 'Saving contact…' });
      try { await createContactRecord(input); pulseStatus({ type: 'success', message: 'Contact saved.' }); } catch { pulseStatus({ type: 'error', message: 'Contact failed to save.' }); }
    },
    createWaitingItem: async (input) => {
      const optimistic: WaitingItem = { id: `waiting-${crypto.randomUUID()}`, matterId: input.matterId, subject: input.subject, waitingOn: input.waitingOn, age: input.age || '', next: input.next || '' };
      setWaitingOn((current) => [optimistic, ...current]);
      pulseStatus({ type: 'saving', message: 'Saving waiting item…' });
      try { await createWaitingItemRecord(input); pulseStatus({ type: 'success', message: 'Waiting item saved.' }); } catch { pulseStatus({ type: 'error', message: 'Waiting item failed to save.' }); }
    },
    createActivity: async (input) => {
      const optimistic: ActivityItem = { id: `activity-${crypto.randomUUID()}`, matterId: input.matterId, type: input.type, summary: input.summary, createdAt: new Date().toLocaleString() };
      setActivity((current) => [optimistic, ...current]);
      pulseStatus({ type: 'saving', message: 'Saving activity…' });
      try { await createActivityRecord(input); pulseStatus({ type: 'success', message: 'Activity saved.' }); } catch { pulseStatus({ type: 'error', message: 'Activity failed to save.' }); }
    },
    createMoneyItem: async (input) => {
      const optimistic: MoneyItem = { id: `money-${crypto.randomUUID()}`, matterId: input.matterId, status: input.status, amount: formatCurrency(input.amount), next: input.next || '' };
      setMoney((current) => [optimistic, ...current]);
      pulseStatus({ type: 'saving', message: 'Saving money item…' });
      try { await createMoneyItemRecord(input); pulseStatus({ type: 'success', message: 'Money item saved.' }); } catch { pulseStatus({ type: 'error', message: 'Money item failed to save.' }); }
    },
    createMatterNote: async (input) => {
      setMatters((current) => current.map((matter) => matter.id === input.matterId ? { ...matter, notes: [input.body, ...matter.notes] } : matter));
      pulseStatus({ type: 'saving', message: 'Saving note…' });
      try { await createMatterNoteRecord(input); pulseStatus({ type: 'success', message: 'Note saved.' }); } catch { pulseStatus({ type: 'error', message: 'Note failed to save.' }); }
    },
    createEvent: async (input) => {
      const optimistic: EventItem = { id: `event-${crypto.randomUUID()}`, matterId: input.matterId, title: input.title, type: input.kind, time: formatEventTime(input.startsAt), startsAt: input.startsAt };
      setEvents((current) => sortEventsByStart([optimistic, ...current]));
      pulseStatus({ type: 'saving', message: 'Saving event…' });
      try { await createEventRecord(input); pulseStatus({ type: 'success', message: 'Event saved.' }); } catch { pulseStatus({ type: 'error', message: 'Event failed to save.' }); }
    },
    deleteTask: async (taskId) => {
      setTasks((current) => current.filter((task) => task.id !== taskId));
      pulseStatus({ type: 'saving', message: 'Deleting task…' });
      try { await deleteTaskRecord(taskId); pulseStatus({ type: 'success', message: 'Task deleted.' }); } catch { pulseStatus({ type: 'error', message: 'Task failed to delete.' }); }
    },
    deleteEvent: async (eventId) => {
      setEvents((current) => current.filter((event) => event.id !== eventId));
      pulseStatus({ type: 'saving', message: 'Deleting event…' });
      try { await deleteEventRecord(eventId); pulseStatus({ type: 'success', message: 'Event deleted.' }); } catch { pulseStatus({ type: 'error', message: 'Event failed to delete.' }); }
    },
    deleteWaitingItem: async (waitingItemId) => {
      setWaitingOn((current) => current.filter((item) => item.id !== waitingItemId));
      pulseStatus({ type: 'saving', message: 'Deleting waiting item…' });
      try { await deleteWaitingItemRecord(waitingItemId); pulseStatus({ type: 'success', message: 'Waiting item deleted.' }); } catch { pulseStatus({ type: 'error', message: 'Waiting item failed to delete.' }); }
    },
    deleteMoneyItem: async (moneyItemId) => {
      setMoney((current) => current.filter((item) => item.id !== moneyItemId));
      pulseStatus({ type: 'saving', message: 'Deleting money item…' });
      try { await deleteMoneyItemRecord(moneyItemId); pulseStatus({ type: 'success', message: 'Money item deleted.' }); } catch { pulseStatus({ type: 'error', message: 'Money item failed to delete.' }); }
    },
    deleteMatterNote: async (matterId, body) => {
      setMatters((current) => current.map((matter) => matter.id === matterId ? { ...matter, notes: matter.notes.filter((note) => note !== body) } : matter));
      pulseStatus({ type: 'saving', message: 'Deleting note…' });
      try { await deleteMatterNoteRecord(matterId, body); pulseStatus({ type: 'success', message: 'Note deleted.' }); } catch { pulseStatus({ type: 'error', message: 'Note failed to delete.' }); }
    },
    updateEvent: async (eventId, input) => {
      setEvents((current) => sortEventsByStart(current.map((event) => event.id === eventId ? { ...event, title: input.title, type: input.kind, startsAt: input.startsAt, time: formatEventTime(input.startsAt) } : event)));
      pulseStatus({ type: 'saving', message: 'Saving event changes…' });
      try { await updateEventRecord(eventId, input); pulseStatus({ type: 'success', message: 'Event updated.' }); } catch { pulseStatus({ type: 'error', message: 'Event failed to update.' }); }
    },
    updateWaitingItem: async (waitingItemId, input) => {
      setWaitingOn((current) => current.map((item) => item.id === waitingItemId ? { ...item, subject: input.subject, waitingOn: input.waitingOn, age: input.age || '', next: input.next || '' } : item));
      pulseStatus({ type: 'saving', message: 'Saving waiting item changes…' });
      try { await updateWaitingItemRecord(waitingItemId, input); pulseStatus({ type: 'success', message: 'Waiting item updated.' }); } catch { pulseStatus({ type: 'error', message: 'Waiting item failed to update.' }); }
    },
    updateMoneyItem: async (moneyItemId, input) => {
      setMoney((current) => current.map((item) => item.id === moneyItemId ? { ...item, status: input.status, amount: formatCurrency(input.amount), next: input.next || '' } : item));
      pulseStatus({ type: 'saving', message: 'Saving money item changes…' });
      try { await updateMoneyItemRecord(moneyItemId, input); pulseStatus({ type: 'success', message: 'Money item updated.' }); } catch { pulseStatus({ type: 'error', message: 'Money item failed to update.' }); }
    },
  }), [activity, contacts, events, hydrated, matters, milestones, money, saveStatus, selectedMatterId, tasks, thresholds, waitingOn]);

  return <MissionControlContext.Provider value={value}>{children}</MissionControlContext.Provider>;
}

export function useMissionControl() {
  const context = useContext(MissionControlContext);
  if (!context) throw new Error('useMissionControl must be used within MissionControlProvider');
  return context;
}
