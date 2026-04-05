import { defaultThresholds, KPIThresholds } from '@/lib/settings';
import { Matter, Task } from '@/lib/types';

export interface MatterMilestone {
  matterId: string;
  leadCreatedAt?: string;
  retainerSentAt?: string;
  retainerSignedAt?: string;
  recordsFirstOrderedAt?: string;
  recordsReceivedAt?: string;
  demandSentAt?: string;
  firstOfferAt?: string;
  settlementReachedAt?: string;
}

export interface KPIStat {
  label: string;
  value: string;
  detail: string;
}

export interface KPIWarning {
  matterId: string;
  label: string;
  detail: string;
  severity: 'high' | 'medium';
}

export interface SourceKPI {
  source: string;
  matterCount: number;
  pipelineValue: number;
  avgLeadToSign: number | null;
  avgFileAge: number | null;
  avgRecordsToDemand: number | null;
  avgDemandToOffer: number | null;
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start?: string, end?: string) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return null;
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000));
}

function avg(values: Array<number | null>) {
  const filtered = values.filter((v): v is number => v !== null);
  if (!filtered.length) return null;
  return Math.round(filtered.reduce((sum, v) => sum + v, 0) / filtered.length);
}

function daysSince(value?: string) {
  const date = parseDate(value);
  if (!date) return null;
  const now = new Date();
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / 86400000));
}

export function buildKpis(matters: Matter[], tasks: Task[], milestones: MatterMilestone[]): KPIStat[] {
  const milestoneMap = new Map(milestones.map((m) => [m.matterId, m]));
  const leadToSign = avg(matters.map((matter) => {
    const m = milestoneMap.get(matter.id);
    return daysBetween(m?.leadCreatedAt, m?.retainerSignedAt);
  }));
  const retainerToSign = avg(matters.map((matter) => {
    const m = milestoneMap.get(matter.id);
    return daysBetween(m?.retainerSentAt, m?.retainerSignedAt);
  }));
  const fileAge = avg(matters.map((matter) => {
    const m = milestoneMap.get(matter.id);
    return daysSince(m?.retainerSignedAt);
  }));
  const recordsToDemand = avg(matters.map((matter) => {
    const m = milestoneMap.get(matter.id);
    return daysBetween(m?.recordsFirstOrderedAt, m?.demandSentAt);
  }));
  const demandToOffer = avg(matters.map((matter) => {
    const m = milestoneMap.get(matter.id);
    return daysBetween(m?.demandSentAt, m?.firstOfferAt);
  }));
  const demandToSettlement = avg(matters.map((matter) => {
    const m = milestoneMap.get(matter.id);
    return daysBetween(m?.demandSentAt, m?.settlementReachedAt);
  }));
  const staleMatters = matters.filter((matter) => {
    const activity = matter.lastActivity.toLowerCase();
    return !activity.includes('today') && !activity.includes('yesterday');
  }).length;
  const overdueTasks = tasks.filter((task) => /overdue/i.test(task.due)).length;
  const statuteRisk = matters.filter((matter) => {
    const statute = parseDate(matter.statute);
    if (!statute) return false;
    const days = Math.round((statute.getTime() - new Date().getTime()) / 86400000);
    return days <= 90;
  }).length;

  return [
    { label: 'Lead → Signed', value: leadToSign !== null ? `${leadToSign}d` : '—', detail: 'Average days from lead created to retainer signed' },
    { label: 'Retainer → Signed', value: retainerToSign !== null ? `${retainerToSign}d` : '—', detail: 'Average days from retainer sent to signed' },
    { label: 'Avg File Age', value: fileAge !== null ? `${fileAge}d` : '—', detail: 'Average days since retainer signed' },
    { label: 'Records → Demand', value: recordsToDemand !== null ? `${recordsToDemand}d` : '—', detail: 'Average days from first records order to demand sent' },
    { label: 'Demand → Offer', value: demandToOffer !== null ? `${demandToOffer}d` : '—', detail: 'Average days from demand sent to first offer' },
    { label: 'Demand → Settlement', value: demandToSettlement !== null ? `${demandToSettlement}d` : '—', detail: 'Average days from demand sent to settlement' },
    { label: 'Stale Matters', value: `${staleMatters}`, detail: 'Matters without today/yesterday activity markers' },
    { label: 'Overdue Tasks', value: `${overdueTasks}`, detail: 'Tasks explicitly marked overdue' },
    { label: 'Statute Risk', value: `${statuteRisk}`, detail: 'Matters with statute inside 90 days' },
  ];
}

export function buildWarnings(matters: Matter[], tasks: Task[], milestones: MatterMilestone[], thresholds: KPIThresholds = defaultThresholds): KPIWarning[] {
  const milestoneMap = new Map(milestones.map((m) => [m.matterId, m]));
  const warnings: KPIWarning[] = [];

  for (const matter of matters) {
    const milestone = milestoneMap.get(matter.id);
    const recordsToDemand = daysBetween(milestone?.recordsFirstOrderedAt, milestone?.demandSentAt);
    const demandAge = daysSince(milestone?.demandSentAt);
    const retainerOutstanding = milestone?.retainerSentAt && !milestone?.retainerSignedAt ? daysSince(milestone.retainerSentAt) : null;

    if (recordsToDemand !== null && recordsToDemand > thresholds.recordsToDemandDays) {
      warnings.push({ matterId: matter.id, label: 'Slow demand cycle', detail: `${recordsToDemand} days from records order to demand`, severity: 'medium' });
    }
    if (milestone?.demandSentAt && !milestone?.firstOfferAt && demandAge !== null && demandAge > thresholds.demandWithoutOfferDays) {
      warnings.push({ matterId: matter.id, label: 'Demand aging without offer', detail: `${demandAge} days since demand sent`, severity: 'high' });
    }
    if (retainerOutstanding !== null && retainerOutstanding > thresholds.unsignedRetainerDays) {
      warnings.push({ matterId: matter.id, label: 'Unsigned retainer aging', detail: `${retainerOutstanding} days since retainer sent`, severity: 'medium' });
    }
  }

  for (const task of tasks) {
    if (/overdue/i.test(task.due)) {
      warnings.push({ matterId: task.matterId, label: 'Overdue task', detail: task.title, severity: 'high' });
    }
  }

  return warnings;
}

export function buildSourceKpis(matters: Matter[], milestones: MatterMilestone[]): SourceKPI[] {
  const milestoneMap = new Map(milestones.map((m) => [m.matterId, m]));
  const groups = new Map<string, Matter[]>();

  for (const matter of matters) {
    const key = matter.sourceType?.trim() || 'Unknown';
    const bucket = groups.get(key) ?? [];
    bucket.push(matter);
    groups.set(key, bucket);
  }

  return Array.from(groups.entries()).map(([source, groupedMatters]) => {
    const leadToSign = avg(groupedMatters.map((matter) => {
      const m = milestoneMap.get(matter.id);
      return daysBetween(m?.leadCreatedAt, m?.retainerSignedAt);
    }));
    const fileAge = avg(groupedMatters.map((matter) => {
      const m = milestoneMap.get(matter.id);
      return daysSince(m?.retainerSignedAt);
    }));
    const recordsToDemand = avg(groupedMatters.map((matter) => {
      const m = milestoneMap.get(matter.id);
      return daysBetween(m?.recordsFirstOrderedAt, m?.demandSentAt);
    }));
    const demandToOffer = avg(groupedMatters.map((matter) => {
      const m = milestoneMap.get(matter.id);
      return daysBetween(m?.demandSentAt, m?.firstOfferAt);
    }));
    const pipelineValue = groupedMatters.reduce((sum, matter) => sum + Number((matter.value || '$0').replace(/[$,]/g, '') || 0), 0);

    return {
      source,
      matterCount: groupedMatters.length,
      pipelineValue,
      avgLeadToSign: leadToSign,
      avgFileAge: fileAge,
      avgRecordsToDemand: recordsToDemand,
      avgDemandToOffer: demandToOffer,
    };
  }).sort((a, b) => b.pipelineValue - a.pipelineValue);
}

export function matterTiming(matter: Matter, milestone?: MatterMilestone) {
  return [
    { label: 'Lead → Signed', value: daysBetween(milestone?.leadCreatedAt, milestone?.retainerSignedAt) },
    { label: 'Retainer Sent → Signed', value: daysBetween(milestone?.retainerSentAt, milestone?.retainerSignedAt) },
    { label: 'File Age', value: daysSince(milestone?.retainerSignedAt) },
    { label: 'Records Ordered → Demand', value: daysBetween(milestone?.recordsFirstOrderedAt, milestone?.demandSentAt) },
    { label: 'Demand → First Offer', value: daysBetween(milestone?.demandSentAt, milestone?.firstOfferAt) },
    { label: 'Demand → Settlement', value: daysBetween(milestone?.demandSentAt, milestone?.settlementReachedAt) },
    { label: 'Days Since Last Activity', value: null },
  ].map((item) => ({ ...item, display: item.value === null ? '—' : `${item.value}d` }));
}
