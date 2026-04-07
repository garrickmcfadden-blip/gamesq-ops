import { ActivityItem, Contact, EventItem, Matter, MoneyItem, Task, WaitingItem } from '@/lib/types';

// Intentionally empty runtime defaults.
// Mission Control should render from Supabase data, not placeholder seed content.

export const stats = [
  { label: 'Active matters', value: '—', delta: 'Live from Supabase' },
  { label: 'Urgent items', value: '—', delta: 'Live from Supabase' },
  { label: 'Waiting on others', value: '—', delta: 'Live from Supabase' },
  { label: 'Fees in pipeline', value: '—', delta: 'Live from Supabase' },
];

export const matters: Matter[] = [];
export const contacts: Contact[] = [];
export const tasks: Task[] = [];
export const today: EventItem[] = [];
export const waitingOn: WaitingItem[] = [];
export const money: MoneyItem[] = [];
export const activity: ActivityItem[] = [];
export const milestones = [];
export const feed: string[] = [];
