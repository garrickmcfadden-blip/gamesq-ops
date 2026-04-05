import { ActivityItem, Contact, EventItem, Matter, MoneyItem, Task, WaitingItem } from '@/lib/types';

export const stats = [
  { label: 'Active matters', value: '42', delta: '+3 this week' },
  { label: 'Urgent items', value: '11', delta: '4 need Garrick' },
  { label: 'Waiting on others', value: '19', delta: '6 stale > 7 days' },
  { label: 'Fees in pipeline', value: '$184k', delta: '$52k likely < 30d' },
];

export const matters: Matter[] = [
  {
    id: 'jones-titan',
    title: 'Jones v. Titan Logistics',
    client: 'Marcus Jones',
    stage: 'Litigation',
    priority: 'critical',
    status: 'Discovery pressure rising',
    owner: 'Garrick',
    lastActivity: 'Opposing counsel requested extension today',
    nextAction: 'Finalize Rule 26 disclosure draft',
    blocker: 'Need final wage loss backup',
    value: '$250,000',
    incidentDate: '2025-08-14',
    statute: '2027-08-14',
    notes: ['Depo prep scheduled.', 'Defense requested a 2-week extension.', 'Court date confirmation still pending.'],
  },
  {
    id: 'carter-claim',
    title: 'Carter claim',
    client: 'Danielle Carter',
    stage: 'Demand',
    priority: 'high',
    status: 'Demand package out',
    owner: 'Garrick',
    lastActivity: 'Mediation hold placed for April 9',
    nextAction: 'Carrier call Friday',
    blocker: 'Waiting on adjuster response',
    value: '$75,000',
    incidentDate: '2025-10-02',
    statute: '2027-10-02',
    notes: ['Demand delivered.', 'Adjuster response overdue.', 'Mediation hold looks promising.'],
  },
  {
    id: 'reed-claim',
    title: 'Reed claim',
    client: 'Sabrina Reed',
    stage: 'Demand',
    priority: 'high',
    status: 'Offer pending',
    owner: 'Garrick',
    lastActivity: 'Client available to sign after 7 PM',
    nextAction: 'Get signature and settlement authority',
    blocker: 'Client signature outstanding',
    value: '$42,500',
    incidentDate: '2025-11-28',
    statute: '2027-11-28',
    notes: ['Client responsive by text.', 'Settlement movement likely once authority confirmed.'],
  },
  {
    id: 'young-intake',
    title: 'Young intake',
    client: 'Tyrone Young',
    stage: 'Intake',
    priority: 'medium',
    status: 'Police report still missing',
    owner: 'Ops',
    lastActivity: 'Records request sent 2 days ago',
    nextAction: 'Escalate records request',
    blocker: 'No police report yet',
    value: '$18,000',
    incidentDate: '2026-02-18',
    statute: '2028-02-18',
    notes: ['Lead appears viable.', 'Need crash report and treatment confirmation.'],
  },
  {
    id: 'alvarez-claim',
    title: 'Alvarez claim',
    client: 'Maria Alvarez',
    stage: 'Resolution',
    priority: 'medium',
    status: 'Settlement draft in finalization',
    owner: 'Ops',
    lastActivity: 'Client call set for 9:00 AM',
    nextAction: 'Finalize disbursement',
    blocker: 'Need last lien confirmation',
    value: '$31,000',
    incidentDate: '2025-06-03',
    statute: '2027-06-03',
    sourceType: 'Lawyer Referral',
    sourceDetail: 'Co-counsel referral',
    campaign: '',
    notes: ['Near fee realization.', 'Final paperwork should close this out quickly.'],
  },
];

export const contacts: Contact[] = [
  { id: 'c1', matterId: 'jones-titan', name: 'Marcus Jones', role: 'client', phone: '(602) 555-0101', email: 'marcus@example.com' },
  { id: 'c2', matterId: 'jones-titan', name: 'Elaine Porter', role: 'defense_counsel', email: 'eporter@defensefirm.com' },
  { id: 'c3', matterId: 'carter-claim', name: 'Danielle Carter', role: 'client', phone: '(602) 555-0102' },
  { id: 'c4', matterId: 'carter-claim', name: 'State Farm Adjuster', role: 'adjuster' },
  { id: 'c5', matterId: 'reed-claim', name: 'Sabrina Reed', role: 'client', phone: '(602) 555-0103' },
  { id: 'c6', matterId: 'young-intake', name: 'Tyrone Young', role: 'client', phone: '(602) 555-0104' },
];

export const tasks: Task[] = [
  { id: 't1', matterId: 'jones-titan', title: 'Rule 26 disclosure draft', owner: 'Garrick', due: 'Today 4:00 PM', priority: 'critical', status: 'open' },
  { id: 't2', matterId: 'reed-claim', title: 'Get demand package signed', owner: 'Client', due: 'Today', priority: 'high', status: 'waiting' },
  { id: 't3', matterId: 'carter-claim', title: 'Follow up with adjuster', owner: 'Ops', due: '1 day overdue', priority: 'high', status: 'open' },
  { id: 't4', matterId: 'young-intake', title: 'Obtain police report', owner: 'Records', due: '2 days overdue', priority: 'medium', status: 'waiting' },
  { id: 't5', matterId: 'alvarez-claim', title: 'Finalize settlement statement', owner: 'Ops', due: 'Tomorrow', priority: 'medium', status: 'in_progress' },
];

export const today: EventItem[] = [
  { id: 'e1', matterId: 'alvarez-claim', time: '3/22/2026 9:00 AM', title: 'Client call — Alvarez', type: 'Call', startsAt: '2026-03-22T09:00:00' },
  { id: 'e2', matterId: 'jones-titan', time: '3/22/2026 11:30 AM', title: 'Depo prep — Jones', type: 'Prep', startsAt: '2026-03-22T11:30:00' },
  { id: 'e3', matterId: 'carter-claim', time: '3/22/2026 2:00 PM', title: 'Demand review — Carter', type: 'Review', startsAt: '2026-03-22T14:00:00' },
  { id: 'e4', matterId: 'jones-titan', time: '3/22/2026 4:00 PM', title: 'Draft disclosure deadline — Titan', type: 'Deadline', startsAt: '2026-03-22T16:00:00' },
];

export const waitingOn: WaitingItem[] = [
  { id: 'w1', matterId: 'carter-claim', subject: 'State Farm adjuster response', waitingOn: 'Carrier', age: '9d', next: 'Chase tomorrow' },
  { id: 'w2', matterId: 'young-intake', subject: 'Medical records packet', waitingOn: 'Provider', age: '12d', next: 'Escalate provider' },
  { id: 'w3', matterId: 'reed-claim', subject: 'Signed retainer / authority', waitingOn: 'Client', age: '3d', next: 'Text tonight' },
  { id: 'w4', matterId: 'jones-titan', subject: 'Court date confirmation', waitingOn: 'Court', age: '2d', next: 'Call clerk' },
];

export const money: MoneyItem[] = [
  { id: 'm1', matterId: 'carter-claim', status: 'Demand out', amount: '$75,000', next: 'Carrier call Friday' },
  { id: 'm2', matterId: 'reed-claim', status: 'Offer pending', amount: '$42,500', next: 'Client authority needed' },
  { id: 'm3', matterId: 'jones-titan', status: 'Suit posture', amount: '$250,000', next: 'Depo prep' },
  { id: 'm4', matterId: 'alvarez-claim', status: 'Settlement draft', amount: '$31,000', next: 'Finalize disbursement' },
];

export const activity: ActivityItem[] = [
  { id: 'a1', matterId: 'jones-titan', createdAt: 'Today 8:32 AM', type: 'filing', summary: 'Defense requested a two-week extension on disclosures.' },
  { id: 'a2', matterId: 'jones-titan', createdAt: 'Yesterday 4:10 PM', type: 'note', summary: 'Need wage loss backup before final disclosure package.' },
  { id: 'a3', matterId: 'carter-claim', createdAt: 'Today 1:15 PM', type: 'demand', summary: 'Demand package confirmed delivered; follow-up call set for Friday.' },
  { id: 'a4', matterId: 'reed-claim', createdAt: 'Today 6:45 PM', type: 'note', summary: 'Client says she can sign tonight after 7 PM.' },
  { id: 'a5', matterId: 'alvarez-claim', createdAt: 'Today 9:05 AM', type: 'settlement', summary: 'Disbursement draft nearly complete; lien balance needs confirmation.' },
];

export const milestones = [
  {
    matterId: 'jones-titan',
    leadCreatedAt: '2025-08-16',
    retainerSentAt: '2025-08-17',
    retainerSignedAt: '2025-08-18',
    recordsFirstOrderedAt: '2025-11-01',
    recordsReceivedAt: '2025-12-02',
    demandSentAt: '2026-01-15',
    firstOfferAt: '2026-02-03',
  },
  {
    matterId: 'carter-claim',
    leadCreatedAt: '2025-10-03',
    retainerSentAt: '2025-10-04',
    retainerSignedAt: '2025-10-05',
    recordsFirstOrderedAt: '2026-01-20',
    recordsReceivedAt: '2026-02-14',
    demandSentAt: '2026-03-01',
    firstOfferAt: '2026-03-12',
  },
  {
    matterId: 'reed-claim',
    leadCreatedAt: '2025-11-29',
    retainerSentAt: '2025-11-30',
    retainerSignedAt: '2025-12-01',
    recordsFirstOrderedAt: '2026-02-05',
    recordsReceivedAt: '2026-02-26',
    demandSentAt: '2026-03-15',
  },
  {
    matterId: 'young-intake',
    leadCreatedAt: '2026-02-18',
    retainerSentAt: '2026-02-19',
  },
  {
    matterId: 'alvarez-claim',
    leadCreatedAt: '2025-06-05',
    retainerSentAt: '2025-06-06',
    retainerSignedAt: '2025-06-07',
    recordsFirstOrderedAt: '2025-08-10',
    recordsReceivedAt: '2025-09-02',
    demandSentAt: '2025-10-01',
    firstOfferAt: '2025-10-17',
    settlementReachedAt: '2026-03-10',
  },
];

export const feed = [
  'New lead submitted from YouTube short — rear-end collision in Glendale',
  'Mason UM case medical specials updated to $18,420',
  'Client Reed texted: available to sign tonight after 7 PM',
  'Jones opposing counsel requested two-week extension on disclosures',
  'Calendar: mediation hold placed for Carter on April 9',
];
