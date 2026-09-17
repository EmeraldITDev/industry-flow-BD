import { Project, PipelineStage } from '@/types';
import { AccountGroup, matchAccountGroup } from './accountGroups';

/* ------------------------------------------------------------------ *
 * Definitions agreed with the business
 * ------------------------------------------------------------------ */

/** Stages treated as commercially secured ("Won"). */
export const WON_STAGES: PipelineStage[] = ['approval', 'execution', 'closure'];
/** Stages treated as late-stage pipeline. */
export const LATE_STAGES: PipelineStage[] = ['proposal', 'negotiation', 'approval'];
/** Stages shown in the executive funnel, in order. */
export const FUNNEL_STAGES: PipelineStage[] = [
  'initiation',
  'qualification',
  'proposal',
  'negotiation',
  'execution',
];

export const STAGE_LABELS: Record<string, string> = {
  cold: 'Cold',
  initiation: 'Initiation',
  qualification: 'Qualification',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  approval: 'Approval / Won',
  execution: 'Execution',
  closure: 'Closure',
  lost: 'Lost',
};

/** Days without an update before a late-stage opportunity counts as stagnating. */
export const STAGNATION_DAYS = 45;
/** Window used for "closing soon". */
export const CLOSING_SOON_DAYS = 45;

/* ------------------------------------------------------------------ *
 * Review periods
 * ------------------------------------------------------------------ */

export type ReviewPeriodKey =
  | 'snapshot'
  | 'last7'
  | 'last14'
  | 'month'
  | 'prevMonth'
  | 'quarter'
  | 'ytd';

export const REVIEW_PERIODS: { key: ReviewPeriodKey; label: string }[] = [
  { key: 'snapshot', label: 'Current Snapshot' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last14', label: 'Last 14 Days' },
  { key: 'month', label: 'Current Month' },
  { key: 'prevMonth', label: 'Previous Month' },
  { key: 'quarter', label: 'Current Quarter' },
  { key: 'ytd', label: 'Year to Date' },
];

export interface ReviewWindow {
  key: ReviewPeriodKey;
  label: string;
  /** Start of the current review window; null for an all-time snapshot. */
  start: Date | null;
  end: Date;
  /** Equivalent preceding window, used for movement comparisons. */
  prevStart: Date | null;
  prevEnd: Date | null;
}

const dayMs = 86_400_000;

export function resolveReviewWindow(
  key: ReviewPeriodKey,
  custom?: { from?: Date; to?: Date },
  now: Date = new Date()
): ReviewWindow {
  const label = REVIEW_PERIODS.find((p) => p.key === key)?.label ?? 'Current Snapshot';
  const end = custom?.to ?? now;
  const back = (days: number) => new Date(end.getTime() - days * dayMs);

  let start: Date | null = null;
  switch (key) {
    case 'last7':
      start = back(7);
      break;
    case 'last14':
      start = back(14);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'prevMonth':
      return {
        key,
        label,
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
        prevStart: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        prevEnd: new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59),
      };
    case 'quarter':
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      break;
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = null;
  }

  if (!start) return { key, label, start: null, end, prevStart: null, prevEnd: null };

  const span = end.getTime() - start.getTime();
  return {
    key,
    label,
    start,
    end,
    prevStart: new Date(start.getTime() - span),
    prevEnd: start,
  };
}

/* ------------------------------------------------------------------ *
 * Field helpers — currency values are never mixed or converted
 * ------------------------------------------------------------------ */

export const usdOf = (p: Project) => Number(p.contractValueUSD ?? 0) || 0;
export const ngnOf = (p: Project) => Number(p.contractValueNGN ?? 0) || 0;
/** Magnitude used only for ranking, never displayed as a total. */
const rankWeight = (p: Project) => usdOf(p) + ngnOf(p) / 1_000_000;

const toDate = (value: any): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export const createdAtOf = (p: Project) =>
  toDate((p as any).createdAt ?? (p as any).created_at ?? p.startDate);
export const updatedAtOf = (p: Project) =>
  toDate((p as any).updatedAt ?? (p as any).updated_at) ?? createdAtOf(p);

/** Canonical reporting date: Start Date, falling back to Intake Date. */
export const reportingDateOf = (p: Project) =>
  toDate(p.startDate) ?? toDate(p.pipelineIntakeDate);

export const daysSince = (d: Date | null, now = new Date()) =>
  d ? Math.floor((now.getTime() - d.getTime()) / dayMs) : null;

export type ProbabilityBand = 'high' | 'medium' | 'low';

export function probabilityBand(p: Project): ProbabilityBand {
  switch (p.dealProbability) {
    case 'critical':
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    default:
      return 'low';
  }
}

const PROBABILITY_SCORE: Record<ProbabilityBand, number> = { high: 0.75, medium: 0.45, low: 0.15 };

export const isWon = (p: Project) =>
  WON_STAGES.includes((p.pipelineStage || '').toLowerCase().trim() as PipelineStage) ||
  p.status === 'completed';
export const isLost = (p: Project) => (p.pipelineStage || '').toLowerCase().trim() === 'lost';
export const isActivePipeline = (p: Project) => p.status === 'active';
export const isLateStage = (p: Project) =>
  LATE_STAGES.includes((p.pipelineStage || '').toLowerCase().trim() as PipelineStage);

const inWindow = (d: Date | null, start: Date | null, end: Date | null) => {
  if (!d) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

/* ------------------------------------------------------------------ *
 * Aggregate shapes
 * ------------------------------------------------------------------ */

export interface ValueBucket {
  count: number;
  usd: number;
  ngn: number;
}

const emptyBucket = (): ValueBucket => ({ count: 0, usd: 0, ngn: 0 });

const addTo = (bucket: ValueBucket, p: Project, share = 1) => {
  bucket.count += share === 1 ? 1 : 0;
  bucket.usd += usdOf(p) * share;
  bucket.ngn += ngnOf(p) * share;
};

export interface StageRow {
  stage: PipelineStage;
  label: string;
  count: number;
  share: number;
  usd: number;
  ngn: number;
  avgProbability: number;
  newInPeriod: number;
  interpretation: string;
  metric?: string;
}

export interface OpportunityRow {
  id: string;
  name: string;
  client: string;
  stage: PipelineStage;
  stageLabel: string;
  probability: ProbabilityBand;
  usd: number;
  ngn: number;
  expectedCloseDate: string | null;
  businessVertical: string;
  sector: string;
  products: string[];
  subproducts: string[];
  owner: string;
  lastActivity: Date | null;
  daysIdle: number | null;
  priorityScore: number;
}

export interface RankedGroup {
  key: string;
  label: string;
  count: number;
  usd: number;
  ngn: number;
  lateStage: number;
  won: number;
  wonUsd: number;
  wonNgn: number;
  avgProbability: number;
  weightedUsd: number;
  metric?: string;
  value_share_pct?: number | null;
  record_share_pct?: number | null;
}

export interface AccountSnapshot extends RankedGroup {
  groupId: string | null;
  isConfiguredGroup: boolean;
  byStage: Record<string, number>;
  byProbability: Record<ProbabilityBand, number>;
  byEntity: RankedGroup[];
  proposal: number;
  negotiation: number;
  execution: number;
  nearConversion: number;
  newInPeriod: number;
  topOpportunities: OpportunityRow[];
  clientNames: string[];
}

export interface ExecutiveIntelligence {
  window: ReviewWindow;
  totals: {
    all: number;
    active: number;
    activeUsd: number;
    activeNgn: number;
    won: number;
    wonUsd: number;
    wonNgn: number;
    proposal: number;
    negotiation: number;
    execution: number;
    lost: number;
    lateStage: number;
    lateStageUsd: number;
    lateStageNgn: number;
    high: number;
    medium: number;
    low: number;
    newInPeriod: number;
    newPrevPeriod: number;
    wonInPeriod: number;
    wonPrevPeriod: number;
    updatedInPeriod: number;
    nearConversion: number;
    weightedUsd: number;
    weightedNgn: number;
  };
  stages: StageRow[];
  health: { verdict: string; tone: 'good' | 'watch' | 'risk'; narrative: string };
  conversion: {
    wonYear: number;
    wonQuarter: number;
    wonMonth: number;
    wonUsd: number;
    wonNgn: number;
    avgWonUsd: number;
    avgWonNgn: number;
    inExecution: number;
    byMonth: { month: string; count: number; usd: number; ngn: number }[];
    byClient: RankedGroup[];
    bySector: RankedGroup[];
    byVertical: RankedGroup[];
    byProduct: RankedGroup[];
    byPartner: RankedGroup[];
  };
  nearConversion: OpportunityRow[];
  accounts: AccountSnapshot[];
  partners: RankedGroup[];
  clients: RankedGroup[];
  clientConcentration?: {
    currency: 'ngn' | 'usd';
    totalRecords: number;
    totalValue: number;
    clients: RankedGroup[];
    top: RankedGroup | null;
  };
  metrics?: {
    active: string;
    won: string;
    nearConversion: string;
  };
  dimensions: {
    verticals: RankedGroup[];
    sectors: RankedGroup[];
    products: RankedGroup[];
    subproducts: RankedGroup[];
  };
  movement: {
    created: OpportunityRow[];
    updated: OpportunityRow[];
    won: OpportunityRow[];
    overdue: OpportunityRow[];
  };
  risks: {
    label: string;
    value: string;
    detail: string;
    tone: 'good' | 'watch' | 'risk';
    metric?: string;
    valueSharePct?: number;
    recordSharePct?: number;
  }[];
  summary: string[];
}

/* ------------------------------------------------------------------ *
 * Row + ranking builders
 * ------------------------------------------------------------------ */

function toRow(p: Project, ownerName: string, now: Date): OpportunityRow {
  const last = updatedAtOf(p);
  const idle = daysSince(last, now);
  const close = toDate(p.expectedCloseDate);
  const daysToClose = close ? Math.floor((close.getTime() - now.getTime()) / dayMs) : null;
  const band = probabilityBand(p);

  // Executive priority: late stage + probability + magnitude + closeness, less staleness.
  let score = 0;
  if (p.pipelineStage === 'negotiation') score += 40;
  else if (p.pipelineStage === 'proposal') score += 28;
  else if (p.pipelineStage === 'approval') score += 22;
  else if (p.pipelineStage === 'qualification') score += 10;
  score += PROBABILITY_SCORE[band] * 40;
  score += Math.min(30, Math.log10(1 + rankWeight(p)) * 6);
  if (daysToClose !== null && daysToClose >= 0 && daysToClose <= CLOSING_SOON_DAYS) score += 15;
  if (daysToClose !== null && daysToClose < 0) score += 8;
  if (idle !== null && idle > STAGNATION_DAYS) score -= 10;

  return {
    id: String(p.id),
    name: p.name || 'Untitled opportunity',
    client: p.clientName || 'Unspecified client',
    stage: p.pipelineStage,
    stageLabel: STAGE_LABELS[p.pipelineStage] ?? p.pipelineStage,
    probability: band,
    usd: usdOf(p),
    ngn: ngnOf(p),
    expectedCloseDate: p.expectedCloseDate ?? null,
    businessVertical: p.businessVertical || '',
    sector: p.sector || '',
    products: p.products ?? [],
    subproducts: p.subproducts ?? [],
    owner: ownerName,
    lastActivity: last,
    daysIdle: idle,
    priorityScore: Math.round(score),
  };
}

function rank(map: Map<string, RankedGroup>): RankedGroup[] {
  return Array.from(map.values()).sort(
    (a, b) => b.usd + b.ngn / 1_000_000 - (a.usd + a.ngn / 1_000_000)
  );
}

function bump(
  map: Map<string, RankedGroup>,
  key: string,
  label: string,
  p: Project,
  share = 1
): void {
  const g =
    map.get(key) ??
    ({
      key,
      label,
      count: 0,
      usd: 0,
      ngn: 0,
      lateStage: 0,
      won: 0,
      wonUsd: 0,
      wonNgn: 0,
      avgProbability: 0,
      weightedUsd: 0,
    } as RankedGroup);
  g.count += 1;
  g.usd += usdOf(p) * share;
  g.ngn += ngnOf(p) * share;
  if (isLateStage(p)) g.lateStage += 1;
  if (isWon(p)) {
    g.won += 1;
    g.wonUsd += usdOf(p) * share;
    g.wonNgn += ngnOf(p) * share;
  }
  const score = PROBABILITY_SCORE[probabilityBand(p)];
  g.avgProbability += score;
  g.weightedUsd += usdOf(p) * share * score;
  map.set(key, g);
}

const finaliseAvg = (groups: RankedGroup[]) =>
  groups.map((g) => ({ ...g, avgProbability: g.count ? g.avgProbability / g.count : 0 }));

function attachMetric(groups: RankedGroup[], dimension: string): RankedGroup[] {
  const totalNgn = groups.reduce((s, g) => s + g.ngn, 0);
  const totalCount = groups.reduce((s, g) => s + g.count, 0);
  return groups.map((g) => ({
    ...g,
    metric: `${dimension}:${g.key}`,
    value_share_pct: totalNgn > 0 ? Math.round((g.ngn / totalNgn) * 10000) / 100 : 0,
    record_share_pct: totalCount > 0 ? Math.round((g.count / totalCount) * 10000) / 100 : 0,
  }));
}

const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

/* ------------------------------------------------------------------ *
 * Main builder
 * ------------------------------------------------------------------ */

export function buildExecutiveIntelligence(
  projects: Project[],
  window: ReviewWindow,
  accountGroups: AccountGroup[],
  ownerNameFor: (p: Project) => string,
  now: Date = new Date()
): ExecutiveIntelligence {
  const rows = new Map<string, OpportunityRow>();
  projects.forEach((p) => rows.set(String(p.id), toRow(p, ownerNameFor(p), now)));
  const rowOf = (p: Project) => rows.get(String(p.id))!;

  const active = projects.filter(isActivePipeline);
  const won = projects.filter(isWon);
  const lost = projects.filter(isLost);

  const totals = {
    all: projects.length,
    active: active.length,
    activeUsd: 0,
    activeNgn: 0,
    won: won.length,
    wonUsd: 0,
    wonNgn: 0,
    proposal: 0,
    negotiation: 0,
    execution: 0,
    lost: lost.length,
    lateStage: 0,
    lateStageUsd: 0,
    lateStageNgn: 0,
    high: 0,
    medium: 0,
    low: 0,
    newInPeriod: 0,
    newPrevPeriod: 0,
    wonInPeriod: 0,
    wonPrevPeriod: 0,
    updatedInPeriod: 0,
    nearConversion: 0,
    weightedUsd: 0,
    weightedNgn: 0,
  };

  const clientMap = new Map<string, RankedGroup>();
  const partnerMap = new Map<string, RankedGroup>();
  const verticalMap = new Map<string, RankedGroup>();
  const sectorMap = new Map<string, RankedGroup>();
  const productMap = new Map<string, RankedGroup>();
  const subproductMap = new Map<string, RankedGroup>();
  const wonClientMap = new Map<string, RankedGroup>();
  const wonSectorMap = new Map<string, RankedGroup>();
  const wonVerticalMap = new Map<string, RankedGroup>();
  const wonProductMap = new Map<string, RankedGroup>();
  const wonPartnerMap = new Map<string, RankedGroup>();
  const wonByMonth = new Map<string, { month: string; count: number; usd: number; ngn: number }>();

  projects.forEach((p) => {
    const reporting = reportingDateOf(p);
    const updated = updatedAtOf(p);
    const band = probabilityBand(p);
    const score = PROBABILITY_SCORE[band];

    if (isActivePipeline(p)) {
      totals.activeUsd += usdOf(p);
      totals.activeNgn += ngnOf(p);
      totals.weightedUsd += usdOf(p) * score;
      totals.weightedNgn += ngnOf(p) * score;
      if (band === 'high') totals.high += 1;
      else if (band === 'medium') totals.medium += 1;
      else totals.low += 1;
    }
    if (p.pipelineStage === 'proposal') totals.proposal += 1;
    if (p.pipelineStage === 'negotiation') totals.negotiation += 1;
    if (p.pipelineStage === 'execution') totals.execution += 1;
    if (isLateStage(p)) {
      totals.lateStage += 1;
      totals.lateStageUsd += usdOf(p);
      totals.lateStageNgn += ngnOf(p);
    }
    if (isWon(p)) {
      totals.wonUsd += usdOf(p);
      totals.wonNgn += ngnOf(p);
    }
    if (inWindow(reporting, window.start, window.end)) totals.newInPeriod += 1;
    if (inWindow(reporting, window.prevStart, window.prevEnd)) totals.newPrevPeriod += 1;
    if (updated && inWindow(updated, window.start, window.end)) totals.updatedInPeriod += 1;
    if (isWon(p) && inWindow(reporting, window.start, window.end)) totals.wonInPeriod += 1;
    if (isWon(p) && inWindow(reporting, window.prevStart, window.prevEnd)) totals.wonPrevPeriod += 1;

    // Commercial drivers — active opportunities only, labels case-folded.
    if (isActivePipeline(p)) {
      const clientLabel = (p.clientName || '').trim();
      if (clientLabel) bump(clientMap, clientLabel.toLowerCase(), clientLabel, p);
      const partner = (p.channelPartner || '').trim();
      const oem = (p.oem || '').trim();
      const partnerLabel = partner || (oem && oem.toLowerCase() !== 'n/a' ? oem : '');
      if (partnerLabel) bump(partnerMap, partnerLabel.toLowerCase(), partnerLabel, p);
      if (p.businessVertical)
        bump(verticalMap, p.businessVertical.toLowerCase().trim(), p.businessVertical, p);
      if (p.sector) bump(sectorMap, p.sector.toLowerCase().trim(), p.sector, p);

      const prods = [...new Set((p.products ?? []).filter(Boolean).map((pr) => String(pr).trim()))];
      prods.forEach((pr) => bump(productMap, pr.toLowerCase(), pr, p));
      const subs = [...new Set((p.subproducts ?? []).filter(Boolean).map((s) => String(s).trim()))];
      subs.forEach((s) => bump(subproductMap, s.toLowerCase(), s, p));
    }

    if (isWon(p)) {
      bump(wonClientMap, (p.clientName || 'Unspecified').toLowerCase(), p.clientName || 'Unspecified', p);
      if (p.sector) bump(wonSectorMap, p.sector, p.sector, p);
      if (p.businessVertical) bump(wonVerticalMap, p.businessVertical, p.businessVertical, p);
      const prods = (p.products ?? []).filter(Boolean);
      prods.forEach((pr) => bump(wonProductMap, pr, pr, p, 1 / prods.length));
      const partnerLabel = (p.channelPartner || '').trim();
      if (partnerLabel) bump(wonPartnerMap, partnerLabel.toLowerCase(), partnerLabel, p);

      const when = reporting;
      if (when) {
        const key = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
        const bucket = wonByMonth.get(key) ?? { month: key, count: 0, usd: 0, ngn: 0 };
        bucket.count += 1;
        bucket.usd += usdOf(p);
        bucket.ngn += ngnOf(p);
        wonByMonth.set(key, bucket);
      }
    }
  });

  /* ---------------- Stage health ---------------- */
  const activeTotal = active.length;
  const stages: StageRow[] = FUNNEL_STAGES.map((stage) => {
    const inStage = active.filter((p) => (p.pipelineStage || '').toLowerCase().trim() === stage);
    const bucket = emptyBucket();
    let probSum = 0;
    inStage.forEach((p) => {
      addTo(bucket, p);
      bucket.count = inStage.length;
      probSum += PROBABILITY_SCORE[probabilityBand(p)];
    });
    const avgProb = inStage.length ? probSum / inStage.length : 0;
    const share = activeTotal > 0 ? inStage.length / activeTotal : 0;
    const newInPeriod = inStage.filter((p) => inWindow(reportingDateOf(p), window.start, window.end)).length;
    const stale = inStage.filter((p) => (daysSince(updatedAtOf(p), now) ?? 0) > STAGNATION_DAYS);

    let interpretation = 'Within expected range.';
    if (!inStage.length) interpretation = 'No opportunities recorded at this stage.';
    else if (stage === 'initiation' && share > 0.45)
      interpretation = 'Heavy concentration in early stage — qualification effort needed.';
    else if ((stage === 'proposal' || stage === 'negotiation') && stale.length >= 3)
      interpretation = `${stale.length} opportunities without an update in over ${STAGNATION_DAYS} days.`;
    else if (stage === 'negotiation' && inStage.length)
      interpretation = 'Late-stage value requiring focused conversion activity.';
    else if (stage === 'execution' && inStage.length)
      interpretation = 'Secured work in active delivery.';
    else if (share < 0.05) interpretation = 'Thin stage — limited flow into conversion.';

    return {
      stage,
      label: STAGE_LABELS[stage],
      count: inStage.length,
      share,
      usd: bucket.usd,
      ngn: bucket.ngn,
      avgProbability: avgProb,
      newInPeriod,
      interpretation,
      metric: `stage:${stage}`,
    };
  });

  const initiationShare = stages.find((s) => s.stage === 'initiation')?.share ?? 0;
  const lateShare = activeTotal > 0 ? totals.lateStage / activeTotal : 0;
  const staleLate = projects.filter(
    (p) => isLateStage(p) && (daysSince(updatedAtOf(p), now) ?? 0) > STAGNATION_DAYS
  );

  let health: ExecutiveIntelligence['health'];
  if (staleLate.length >= 5 && lateShare > 0.15) {
    health = {
      verdict: 'Pipeline Risk: late-stage stagnation',
      tone: 'risk',
      narrative: `${staleLate.length} late-stage opportunities have had no recorded update in over ${STAGNATION_DAYS} days. Late-stage opportunities represent ${fmtPct(lateShare)} of the active pipeline and require conversion focus.`,
    };
  } else if (initiationShare > 0.45) {
    health = {
      verdict: 'Pipeline Watch: early-stage concentration',
      tone: 'watch',
      narrative: `${fmtPct(initiationShare)} of active opportunities sit in Initiation. Volume is healthy but conversion depends on moving these into Qualification and Proposal.`,
    };
  } else if (lateShare > 0.2) {
    health = {
      verdict: 'Pipeline Health: strong late-stage position',
      tone: 'good',
      narrative: `${fmtPct(lateShare)} of active opportunities are in Proposal, Negotiation or Approval, with ${totals.execution} already in Execution. Conversion activity should be prioritised on this late-stage value.`,
    };
  } else {
    health = {
      verdict: 'Pipeline Health: stable',
      tone: 'good',
      narrative: `Opportunity distribution across the funnel is balanced, with ${totals.high} high-probability opportunities and ${totals.execution} in Execution.`,
    };
  }

  /* ---------------- Near conversion ---------------- */
  const nearConversion = projects
    .filter((p) => {
      if (isWon(p) || isLost(p)) return false;
      const stage = (p.pipelineStage || '').toLowerCase().trim();
      if (stage === 'negotiation') return true;
      if (stage === 'proposal' && probabilityBand(p) !== 'low') return true;
      const close = toDate(p.expectedCloseDate);
      const days = close ? Math.floor((close.getTime() - now.getTime()) / dayMs) : null;
      return (
        days !== null &&
        days >= 0 &&
        days <= CLOSING_SOON_DAYS &&
        ['proposal', 'qualification', 'negotiation'].includes(stage)
      );
    })
    .map(rowOf)
    .sort((a, b) => b.priorityScore - a.priorityScore);
  totals.nearConversion = nearConversion.length;

  const stagnant = staleLate.filter((p) => !isWon(p));
  const overdue = active.filter((p) => {
    const close = toDate(p.expectedCloseDate);
    return close ? close < now && !isWon(p) : false;
  });

  const clientsRanked = attachMetric(finaliseAvg(rank(clientMap)), 'clients');
  const topClient = clientsRanked[0];
  const partnersRanked = attachMetric(finaliseAvg(rank(partnerMap)), 'partners');
  const partnerTotalUsd = partnersRanked.reduce((s, c) => s + c.usd, 0);
  const topPartner = partnersRanked[0];

  /* ---------------- Strategic accounts ---------------- */
  const groupedProjects = new Map<string, Project[]>();
  const groupMeta = new Map<string, AccountGroup | null>();
  projects.forEach((p) => {
    if (isLost(p)) return;
    const group = matchAccountGroup(p.clientName, accountGroups);
    const key = group ? `group:${group.id}` : `client:${(p.clientName || 'Unspecified').toLowerCase()}`;
    groupMeta.set(key, group);
    groupedProjects.set(key, [...(groupedProjects.get(key) ?? []), p]);
  });

  const accounts: AccountSnapshot[] = Array.from(groupedProjects.entries())
    .map(([key, items]) => {
      const group = groupMeta.get(key) ?? null;
      const label = group ? group.name : items[0].clientName || 'Unspecified';
      const byStage: Record<string, number> = {};
      const byProbability: Record<ProbabilityBand, number> = { high: 0, medium: 0, low: 0 };
      let usd = 0;
      let ngn = 0;
      let wonCount = 0;
      let wonUsd = 0;
      let wonNgn = 0;
      let lateStage = 0;
      let probSum = 0;
      let weightedUsd = 0;
      let newInPeriod = 0;

      items.forEach((p) => {
        usd += usdOf(p);
        ngn += ngnOf(p);
        byStage[p.pipelineStage] = (byStage[p.pipelineStage] ?? 0) + 1;
        byProbability[probabilityBand(p)] += 1;
        if (isWon(p)) {
          wonCount += 1;
          wonUsd += usdOf(p);
          wonNgn += ngnOf(p);
        }
        if (isLateStage(p)) lateStage += 1;
        const s = PROBABILITY_SCORE[probabilityBand(p)];
        probSum += s;
        weightedUsd += usdOf(p) * s;
        if (inWindow(reportingDateOf(p), window.start, window.end)) newInPeriod += 1;
      });

      const entityMap = new Map<string, RankedGroup>();
      if (group) {
        items.forEach((p) => {
          const raw = (p.clientName || 'Unspecified').trim();
          const entity =
            group.entities?.find((e) => raw.toLowerCase().includes(e.toLowerCase())) ?? raw;
          bump(entityMap, entity.toLowerCase(), entity, p);
        });
      }

      const ids = new Set(items.map((p) => String(p.id)));

      return {
        key,
        groupId: group?.id ?? null,
        isConfiguredGroup: !!group,
        label,
        count: items.length,
        usd,
        ngn,
        lateStage,
        won: wonCount,
        wonUsd,
        wonNgn,
        avgProbability: items.length ? probSum / items.length : 0,
        weightedUsd,
        byStage,
        byProbability,
        byEntity: finaliseAvg(rank(entityMap)),
        proposal: byStage['proposal'] ?? 0,
        negotiation: byStage['negotiation'] ?? 0,
        execution: byStage['execution'] ?? 0,
        nearConversion: nearConversion.filter((r) => ids.has(r.id)).length,
        newInPeriod,
        topOpportunities: items
          .map(rowOf)
          .sort((a, b) => b.usd + b.ngn / 1_000_000 - (a.usd + a.ngn / 1_000_000))
          .slice(0, 8),
        clientNames: Array.from(new Set(items.map((p) => p.clientName).filter(Boolean))) as string[],
      };
    })
    .sort((a, b) => {
      if (a.isConfiguredGroup !== b.isConfiguredGroup) return a.isConfiguredGroup ? -1 : 1;
      return b.usd + b.ngn / 1_000_000 - (a.usd + a.ngn / 1_000_000);
    });

  /* ---------------- Movement ---------------- */
  const movement = {
    created: projects
      .filter((p) => inWindow(reportingDateOf(p), window.start, window.end))
      .map(rowOf)
      .sort((a, b) => b.priorityScore - a.priorityScore),
    updated: projects
      .filter(
        (p) =>
          inWindow(updatedAtOf(p), window.start, window.end) &&
          !inWindow(reportingDateOf(p), window.start, window.end) &&
          rankWeight(p) > 0
      )
      .map(rowOf)
      .sort((a, b) => b.usd + b.ngn / 1_000_000 - (a.usd + a.ngn / 1_000_000)),
    won: won
      .filter((p) => inWindow(reportingDateOf(p), window.start, window.end))
      .map(rowOf)
      .sort((a, b) => b.usd + b.ngn / 1_000_000 - (a.usd + a.ngn / 1_000_000)),
    overdue: overdue.map(rowOf).sort((a, b) => b.priorityScore - a.priorityScore),
  };

  /* ---------------- Conversion ---------------- */
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonSince = (from: Date) => won.filter((p) => inWindow(reportingDateOf(p), from, now)).length;

  const conversion: ExecutiveIntelligence['conversion'] = {
    wonYear: wonSince(yearStart),
    wonQuarter: wonSince(quarterStart),
    wonMonth: wonSince(monthStart),
    wonUsd: totals.wonUsd,
    wonNgn: totals.wonNgn,
    avgWonUsd: won.length ? totals.wonUsd / won.length : 0,
    avgWonNgn: won.length ? totals.wonNgn / won.length : 0,
    inExecution: totals.execution,
    byMonth: Array.from(wonByMonth.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    byClient: finaliseAvg(rank(wonClientMap)).slice(0, 10),
    bySector: finaliseAvg(rank(wonSectorMap)),
    byVertical: finaliseAvg(rank(wonVerticalMap)),
    byProduct: finaliseAvg(rank(wonProductMap)),
    byPartner: finaliseAvg(rank(wonPartnerMap)).slice(0, 10),
  };

  /* ---------------- Risk overview ---------------- */
  const risks: ExecutiveIntelligence['risks'] = [];
  if (topClient && (topClient.value_share_pct ?? 0) > 0)
    risks.push({
      label: 'Client concentration',
      value: `${topClient.value_share_pct}% of value · ${topClient.record_share_pct}% of records`,
      detail: `Largest client (${topClient.label}) share of active pipeline`,
      tone:
        (topClient.value_share_pct ?? 0) >= 35 ? 'risk' : (topClient.value_share_pct ?? 0) >= 20 ? 'watch' : 'good',
      metric: topClient.metric,
      valueSharePct: topClient.value_share_pct ?? undefined,
      recordSharePct: topClient.record_share_pct ?? undefined,
    });
  risks.push({
    label: 'Early-stage concentration',
    value: fmtPct(initiationShare),
    detail: 'Share of active opportunities still in Initiation',
    tone: initiationShare > 0.45 ? 'risk' : initiationShare > 0.3 ? 'watch' : 'good',
  });
  risks.push({
    label: 'Low-probability dependence',
    value: fmtPct(activeTotal > 0 ? totals.low / activeTotal : 0),
    detail: 'Share of active opportunities rated low probability',
    tone: (activeTotal > 0 ? totals.low / activeTotal : 0) > 0.5 ? 'risk' : (activeTotal > 0 ? totals.low / activeTotal : 0) > 0.35 ? 'watch' : 'good',
  });
  if (topPartner && partnerTotalUsd > 0)
    risks.push({
      label: 'Partner concentration',
      value: fmtPct(topPartner.usd / partnerTotalUsd),
      detail: `Largest partner (${topPartner.label}) share of partner-linked pipeline`,
      tone: topPartner.usd / partnerTotalUsd >= 0.5 ? 'risk' : 'watch',
    });
  risks.push({
    label: 'Stagnation risk',
    value: String(stagnant.length),
    detail: `Late-stage opportunities idle beyond ${STAGNATION_DAYS} days`,
    tone: stagnant.length >= 5 ? 'risk' : stagnant.length ? 'watch' : 'good',
  });

  /* ---------------- Executive summary (rule-based) ---------------- */
  const summary: string[] = [];
  summary.push(
    `${totals.active} active opportunities are recorded, with ${totals.won} secured or in execution and ${totals.lateStage} in late-stage pipeline.`
  );
  if (window.start)
    summary.push(
      `${totals.newInPeriod} new opportunities were added during ${window.label.toLowerCase()}${
        window.prevStart ? ` (${totals.newPrevPeriod} in the preceding period)` : ''
      }, and ${totals.updatedInPeriod} existing opportunities were updated.`
    );
  summary.push(health.narrative);
  if (nearConversion.length)
    summary.push(
      `${nearConversion.length} opportunities are commercially close to conversion, led by ${nearConversion[0].name} (${nearConversion[0].client}).`
    );

  return {
    window,
    totals,
    stages,
    health,
    conversion,
    nearConversion,
    accounts,
    partners: partnersRanked,
    clients: clientsRanked,
    clientConcentration: {
      currency: 'ngn' as const,
      totalRecords: clientsRanked.reduce((s, c) => s + c.count, 0),
      totalValue: clientsRanked.reduce((s, c) => s + c.ngn, 0),
      clients: clientsRanked,
      top: topClient ?? null,
    },
    metrics: { active: 'active', won: 'won', nearConversion: 'nearConversion' },
    dimensions: {
      verticals: attachMetric(finaliseAvg(rank(verticalMap)), 'verticals'),
      sectors: attachMetric(finaliseAvg(rank(sectorMap)), 'sectors'),
      products: attachMetric(finaliseAvg(rank(productMap)), 'products'),
      subproducts: attachMetric(finaliseAvg(rank(subproductMap)), 'subproducts'),
    },
    movement,
    risks,
    summary,
  };
}
