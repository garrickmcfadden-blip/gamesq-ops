export type Stage = 'Intake' | 'Treatment' | 'Demand' | 'Litigation' | 'Resolution';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus = 'open' | 'in_progress' | 'waiting' | 'done';

export interface Matter {
  id: string;
  title: string;
  client: string;
  stage: Stage;
  priority: Priority;
  status: string;
  owner: string;
  lastActivity: string;
  nextAction: string;
  blocker?: string;
  value: string;
  incidentDate: string;
  statute: string;
  sourceType?: string;
  sourceDetail?: string;
  campaign?: string;
  archived?: boolean;
  archivedAt?: string;
  createdAt?: string;
  notes: MatterNote[];
}

export interface MatterNote {
  id: string;
  matterId: string;
  body: string;
  createdAt?: string;
}

export interface Contact {
  id: string;
  matterId?: string;
  name: string;
  role: 'client' | 'adjuster' | 'provider' | 'defense_counsel' | 'court' | 'witness' | 'other';
  phone?: string;
  email?: string;
}

export interface Task {
  id: string;
  matterId: string;
  title: string;
  owner: string;
  due: string;
  priority: Priority;
  status: TaskStatus;
}

export interface WaitingItem {
  id: string;
  matterId: string;
  subject: string;
  waitingOn: string;
  age: string;
  next: string;
}

export interface EventItem {
  id: string;
  matterId?: string;
  time: string;
  title: string;
  type: string;
  startsAt?: string;
}

export interface MoneyItem {
  id: string;
  matterId: string;
  status: string;
  amount: string;
  next: string;
}

export interface ActivityItem {
  id: string;
  matterId: string;
  createdAt: string;
  type: 'note' | 'call' | 'email' | 'deadline' | 'demand' | 'filing' | 'settlement';
  summary: string;
}

export interface MatterMilestone {
  matterId: string;
  leadCreatedAt?: string;
  letterOfRepSentAt?: string;
  adjusterNotice2WeekAt?: string;
  adjusterNotice30DayAt?: string;
  adjusterNotice60DayAt?: string;
  adjusterNotice90DayAt?: string;
  retainerSentAt?: string;
  retainerSignedAt?: string;
  recordsFirstOrderedAt?: string;
  recordsReceivedAt?: string;
  demandSentAt?: string;
  firstOfferAt?: string;
  defendantAnswerReceivedAt?: string;
  disclosureStatementSentAt?: string;
  firstDiscoverySentAt?: string;
  settlementReachedAt?: string;
  settlementPaperworkReceivedAt?: string;
  settlementPaperworkSentAt?: string;
  settlementCheckReceivedAt?: string;
  clientCheckSentAt?: string;
}

export interface MissionControlSeed {
  matters: Matter[];
  contacts: Contact[];
  tasks: Task[];
  waitingOn: WaitingItem[];
  events: EventItem[];
  money: MoneyItem[];
  activity: ActivityItem[];
  milestones: MatterMilestone[];
}
